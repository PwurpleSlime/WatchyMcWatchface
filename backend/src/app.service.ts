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
  private supabaseClient?: SupabaseClient<Database>;

  getHello(): string {
    return 'Hello World!';
  }

  async getSearchResult(name: string) {
    this.validateSearchName(name);
    return this.searchDatabase(name.trim(), ['name', 'imgURL']);
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
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select<string, Record<string, unknown>>(
        returnParameters.length > 0 ? returnParameters.join(',') : '*',
      )
      .ilike('name', `%${name}%`)
      .limit(returnParameters.length > 0 ? 3 : 1);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to search items: ${error.message}`,
      );
    }
    return data ?? [];
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
