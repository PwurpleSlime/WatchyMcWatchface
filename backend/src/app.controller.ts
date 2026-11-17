import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import {
  getSpeakeasySecret,
  verifySpeakeasyCode,
} from './two-factor.middleware';

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
    description:
      'Partial item name to search for (at least 3 characters); punctuation differences and minor typos are tolerated',
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

  @Get('homePageItems')
  @ApiOperation({
    summary: 'Get homepage items grouped by genre',
    description:
      'Loads item IDs from homePageItems.for_Id and returns each genre with its matching item names and image URLs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Homepage items grouped by genre',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['genre', 'items'],
        properties: {
          genre: { type: 'string', nullable: true },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                imgURL: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Supabase homepage item query failed or is not configured',
  })
  getHomePageItems() {
    return this.appService.getHomePageItems();
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

  @Post('auth/verify-2fa')
  @ApiOperation({ summary: 'Verify a Speakeasy two-factor code' })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['code'],
      properties: { code: { type: 'string', example: '123456' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The two-factor code was verified',
    schema: { type: 'object', properties: { verified: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 401, description: 'The code is invalid or expired' })
  @ApiResponse({
    status: 503,
    description: 'Two-factor authentication is not configured',
  })
  verifyTwoFactor(@Body('code') code: unknown) {
    const secret = getSpeakeasySecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Two-factor authentication is not configured.',
      );
    }
    if (!verifySpeakeasyCode(code, secret)) {
      throw new UnauthorizedException('The two-factor code is invalid.');
    }
    return { verified: true };
  }

  @Post('items')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an item',
    description:
      'Enter the current six-digit Speakeasy code as the bearer token.',
  })
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
  @ApiResponse({ status: 401, description: 'A valid bearer token is required' })
  @ApiResponse({
    status: 500,
    description: 'Supabase insert failed or is not configured',
  })
  createItem(@Body() item: Record<string, unknown>) {
    return this.appService.createItem(item);
  }

  @Delete('items/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an item by ID',
    description:
      'Enter the current six-digit Speakeasy code as the bearer token.',
  })
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
  @ApiResponse({ status: 401, description: 'A valid bearer token is required' })
  @ApiResponse({ status: 404, description: 'No item was found with this ID' })
  @ApiResponse({
    status: 500,
    description: 'Supabase delete failed or is not configured',
  })
  deleteItem(@Param('id') id: string) {
    return this.appService.deleteItem(id);
  }
}
