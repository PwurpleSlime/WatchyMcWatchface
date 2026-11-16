import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Database = {
  public: {
    Tables: {
      items: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      homePageItems: {
        Row: { for_Id: string; genre: string | null };
        Insert: { for_Id: string; genre: string | null };
        Update: { for_Id?: string; genre?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

@Injectable()
export class AppService {
  // Change this placeholder to the name of the Supabase table used by the app.
  private readonly tableName = 'items' as const;
  private readonly fuzzySearchPageSize = 500;
  private supabaseClient?: SupabaseClient<Database>;

  getHello(): string {
    return 'Hello World!';
  }

  async getSearchResult(name: string) {
    this.validateSearchName(name);
    return this.searchDatabase(name.trim(), ['name', 'imgURL']);
  }

  async getHomePageItems() {
    const { data: homepageItems, error: homepageItemsError } =
      await this.supabase.from('homePageItems').select('for_Id,genre');

    if (homepageItemsError) {
      throw new InternalServerErrorException(
        `Failed to load homepage items: ${homepageItemsError.message}`,
      );
    }

    const itemIds = (homepageItems ?? []).map(({ for_Id }) => for_Id);
    if (itemIds.length === 0) {
      return [];
    }

    const { data: items, error: itemsError } = await this.supabase
      .from(this.tableName)
      .select<string, Record<string, unknown>>('id,name,imgURL')
      .in('id', itemIds);

    if (itemsError) {
      throw new InternalServerErrorException(
        `Failed to load homepage item details: ${itemsError.message}`,
      );
    }

    const itemsById = new Map<string, Record<string, unknown>>();
    for (const item of items ?? []) {
      if (typeof item.id === 'string') {
        itemsById.set(item.id, item);
      }
    }
    const groups = new Map<
      unknown,
      { genre: unknown; items: { name: unknown; imgURL: unknown }[] }
    >();

    for (const { for_Id, genre } of homepageItems ?? []) {
      const item = itemsById.get(for_Id);
      if (!item) {
        continue;
      }

      let group = groups.get(genre);
      if (!group) {
        group = { genre, items: [] };
        groups.set(genre, group);
      }
      group.items.push({ name: item.name, imgURL: item.imgURL });
    }

    return [...groups.values()];
  }

  async getSpecificSearch(name: string) {
    this.validateSearchName(name);
    const [item] = await this.searchDatabase(name.trim(), []);
    if (!item) {
      throw new NotFoundException('No matching item was found');
    }
    return item;
  }

  async createItem(item: Record<string, unknown>) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      Object.keys(item).length === 0
    ) {
      throw new BadRequestException('A non-empty item object is required');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to create item: ${error.message}`,
      );
    }
    return data;
  }

  async deleteItem(id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('An item id is required');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        `Failed to delete item: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException(`No item found with id "${id}"`);
    }
    return data;
  }

  private validateSearchName(name: string): void {
    if (typeof name !== 'string' || name.trim().length < 3) {
      throw new BadRequestException('At least 3 characters must be submitted');
    }
  }

  private async searchDatabase(
    name: string,
    returnParameters: string[],
  ): Promise<Record<string, unknown>[]> {
    const select =
      returnParameters.length > 0 ? returnParameters.join(',') : '*';
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select<string, Record<string, unknown>>(select)
      .ilike('name', `%${name}%`)
      .limit(returnParameters.length > 0 ? 3 : 1);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to search items: ${error.message}`,
      );
    }

    if (data?.length) {
      return data;
    }

    const normalizedQuery = this.normalizeTitle(name);
    if (normalizedQuery.length < 3) {
      return [];
    }

    const maxDistance = normalizedQuery.length >= 5 ? 2 : 1;
    const matches: { item: Record<string, unknown>; distance: number }[] = [];

    for (let offset = 0; ; offset += this.fuzzySearchPageSize) {
      const { data: page, error: pageError } = await this.supabase
        .from(this.tableName)
        .select<string, Record<string, unknown>>(select)
        .range(offset, offset + this.fuzzySearchPageSize - 1);

      if (pageError) {
        throw new InternalServerErrorException(
          `Failed to search items: ${pageError.message}`,
        );
      }

      for (const item of page ?? []) {
        const title = this.normalizeTitle(item.name);
        const distance = this.getTitleDistance(
          normalizedQuery,
          title,
          maxDistance,
        );
        if (distance <= maxDistance) {
          matches.push({ item, distance });
        }
      }

      if (!page || page.length < this.fuzzySearchPageSize) {
        break;
      }
    }

    matches.sort((a, b) => a.distance - b.distance);
    return matches
      .slice(0, returnParameters.length > 0 ? 3 : 1)
      .map(({ item }) => item);
  }

  private normalizeTitle(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toLowerCase();
  }

  private getTitleDistance(
    query: string,
    title: string,
    maxDistance: number,
  ): number {
    let bestDistance = maxDistance + 1;
    const minWindowLength = Math.max(1, query.length - maxDistance);
    const maxWindowLength = query.length + maxDistance;

    for (let start = 0; start < title.length; start += 1) {
      const remainingLength = title.length - start;
      const endLimit = Math.min(maxWindowLength, remainingLength);
      for (let length = minWindowLength; length <= endLimit; length += 1) {
        const distance = this.getEditDistance(
          query,
          title.slice(start, start + length),
          maxDistance,
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          if (bestDistance === 0) {
            return 0;
          }
        }
      }
    }

    return bestDistance;
  }

  private getEditDistance(
    left: string,
    right: string,
    maxDistance: number,
  ): number {
    const previous = Array.from(
      { length: right.length + 1 },
      (_, index) => index,
    );

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = [leftIndex];
      let rowMinimum = leftIndex;

      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
        const distance = Math.min(
          current[rightIndex - 1] + 1,
          previous[rightIndex] + 1,
          previous[rightIndex - 1] + cost,
        );
        current.push(distance);
        rowMinimum = Math.min(rowMinimum, distance);
      }

      if (rowMinimum > maxDistance) {
        return maxDistance + 1;
      }

      previous.splice(0, previous.length, ...current);
    }

    return previous[right.length];
  }

  private get supabase(): SupabaseClient<Database> {
    if (!this.supabaseClient) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_KEY;
      if (!url || !key) {
        throw new InternalServerErrorException(
          'Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY.',
        );
      }
      this.supabaseClient = createClient<Database>(url, key);
    }
    return this.supabaseClient;
  }
}
