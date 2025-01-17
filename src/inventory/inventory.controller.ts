/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from './inventory.schema';
import { Response } from 'express';

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

  @Get('generate-pdf/:id')
  async generatePDF(@Param('id') id: string, @Res() res: Response) {
    try {
      // Obtener el inventario por ID desde la base de datos
      const inventory = await this.inventoryService.findOne(id);
      if (!inventory) {
        throw new HttpException(
          'Inventario no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Generar el PDF en memoria como buffer
      const pdfBuffer = await this.inventoryService.generatePDF(inventory);

      // Convertir el buffer a Base64
      const base64PDF = pdfBuffer.toString('base64');

      // Enviar la respuesta como JSON con el Base64
      res.status(HttpStatus.OK).json({
        message: 'PDF generado correctamente',
        base64: base64PDF,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
