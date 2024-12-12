/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from './inventory.schema';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  async create(@Body() createDto: Partial<Inventory>) {
    return this.inventoryService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<Inventory>) {
    return this.inventoryService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.inventoryService.delete(id);
  }
}
