import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('items')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API is running' })
  @ApiResponse({
    status: 200,
    description: 'API greeting',
    schema: { type: 'string' },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('searchForItem')
  @ApiOperation({ summary: 'Search for up to three items by name' })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Partial item name to search for (at least 3 characters)',
    example: 'watch',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching items with their name and image URL',
    schema: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          imgURL: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Search name is shorter than 3 characters',
  })
  @ApiResponse({
    status: 500,
    description: 'Supabase search failed or is not configured',
  })
  getItem(@Query('name') name: string) {
    return this.appService.getSearchResult(name);
  }

  @Get('getItemInformation')
  @ApiOperation({ summary: 'Get all fields for one matching item' })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Partial item name to search for (at least 3 characters)',
    example: 'watch',
  })
  @ApiResponse({
    status: 200,
    description: 'The first matching item, including all its fields',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        imgURL: { type: 'string' },
        synopsis: { type: 'string' },
        genre: { type: 'string' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serviceName: { type: 'string' },
              DUB: { type: 'array', items: { type: 'string' } },
              SUB: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Search name is shorter than 3 characters',
  })
  @ApiResponse({ status: 404, description: 'No matching item was found' })
  @ApiResponse({
    status: 500,
    description: 'Supabase search failed or is not configured',
  })
  getItemInformation(@Query('name') name: string) {
    return this.appService.getSpecificSearch(name);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create an item' })
  @ApiBody({
    required: true,
    description:
      'Item columns and values to insert into the Supabase items table',
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        name: 'Planes, Trains and Automobiles',
        imgURL: '',
        synopsis:
          'An irritable marketing executive tries to get home for Thanksgiving.',
        genre: 'Comedy',
        services: [
          {
            serviceName: 'fuboTV',
            DUB: ['English'],
            SUB: ['English'],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The inserted item',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({
    status: 400,
    description: 'A non-empty item object is required',
  })
  @ApiResponse({
    status: 500,
    description: 'Supabase insert failed or is not configured',
  })
  createItem(@Body() item: Record<string, unknown>) {
    return this.appService.createItem(item);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete an item by ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID of the item to delete',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'The deleted item',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiResponse({ status: 400, description: 'An item ID is required' })
  @ApiResponse({ status: 404, description: 'No item was found with this ID' })
  @ApiResponse({
    status: 500,
    description: 'Supabase delete failed or is not configured',
  })
  deleteItem(@Param('id') id: string) {
    return this.appService.deleteItem(id);
  }
}
