/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EquipmentService } from './equipment.service';
import { Equipment } from './equipment.schema';
import { Response } from 'express';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo_0', maxCount: 1 },
      { name: 'photo_1', maxCount: 1 },
      { name: 'photo_2', maxCount: 1 },
      { name: 'invoice', maxCount: 1 },
    ]),
  )
  async create(
    @Body() data: Partial<Equipment>,
    @UploadedFiles()
    files: {
      photo_0?: Express.Multer.File[];
      photo_1?: Express.Multer.File[];
      photo_2?: Express.Multer.File[];
      invoice?: Express.Multer.File[];
    },
  ): Promise<Equipment> {
    const photos = [
      files.photo_0?.[0],
      files.photo_1?.[0],
      files.photo_2?.[0],
    ].filter(Boolean); // Elimina valores undefined
    const invoice = files.invoice?.[0] || null; // Toma la factura si existe

    return this.service.create({ ...data }, photos, invoice);
  }

  @Get()
  async findAll(): Promise<Equipment[]> {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Equipment> {
    return this.service.findOne(id);
  }

  @Get(':id/photos')
  async getPhotos(@Param('id') id: string, @Res() res: Response) {
    const photos = await this.service.getPhotos(id);
    if (!photos || photos.length === 0) {
      return res.status(404).json({ message: 'Fotos no encontradas.' });
    }

    // Enviar fotos como un arreglo de buffers codificados en Base64
    res.json(
      photos.map((photo) => ({
        buffer: photo.toString('base64'), // Base64 para la visualización en el cliente
      })),
    );
  }

  @Get(':id/invoice')
  async getInvoice(@Param('id') id: string, @Res() res: Response) {
    try {
      const base64Invoice = await this.service.getInvoice(id);
      res.json({ invoice: base64Invoice });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Equipment>,
  ): Promise<Equipment> {
    return this.service.update(id, data); // Mongoose maneja las propiedades automáticamente
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Get('generate-pdf/:id')
  async generatePDF(@Param('id') id: string, @Res() res: Response) {
    try {
      // Obtener el inventario por ID desde la base de datos
      const equipment = await this.service.findOne(id);
      if (!equipment) {
        throw new HttpException(
          'Inventario no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Generar el PDF en memoria como buffer
      const pdfBuffer = await this.service.generatePDF(equipment);

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
