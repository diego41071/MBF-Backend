/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';
import { createWriteStream } from 'fs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
  ) {}

  async create(data: Partial<Inventory>): Promise<Inventory> {
    try {
      const newInventory = new this.inventoryModel(data);
      return await newInventory.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        // Mapeamos los errores de validación
        const validationErrors = Object.keys(error.errors).map((key) => ({
          field: key,
          message: error.errors[key].message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: validationErrors,
        });
      }
      throw new InternalServerErrorException(
        'Failed to create inventory. Please try again.',
      );
    }
  }

  async generatePDF(inventory: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      // Capturar los datos generados por el documento en memoria
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Crear contenido del PDF
      doc.fontSize(16).text('Detalles del Inventario', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Nombre: ${inventory.name}`);
      doc.text(`Marca: ${inventory.brand}`);
      doc.text(`Modelo: ${inventory.model}`);
      doc.text(`Número de serie: ${inventory.serialNumber}`);
      doc.text(`Ubicación: ${inventory.location}`);
      if (inventory.purchaseDate) {
        doc.text(`Fecha de compra: ${inventory.purchaseDate}`);
      }
      doc.text(`Voltaje: ${inventory.voltage || 'No disponible'}`);
      doc.text(`Capacidad: ${inventory.capacity || 'No disponible'}`);
      doc.text(`Prioridad de mantenimiento: ${inventory.maintenancePriority}`);
      doc.end();
    });
  }

  async findAll(): Promise<Inventory[]> {
    return this.inventoryModel.find().exec();
  }

  async findOne(id: string): Promise<Inventory> {
    return this.inventoryModel.findById(id).exec();
  }

  async update(id: string, data: Partial<Inventory>): Promise<Inventory> {
    return this.inventoryModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Inventory> {
    return this.inventoryModel.findByIdAndDelete(id).exec();
  }
}
