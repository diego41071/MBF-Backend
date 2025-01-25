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
      doc
        .fontSize(16)
        .text(
          'IMPORTACIONES MEDIBÁSCULAS ZOMAC S.AS. Whatsapp 304 1301189 serviciotecnico@medibasculas.com CRA 45D #60-72, Medellin, Antioquia',
          { align: 'center' },
        );

      doc.moveDown(2);

      // Definir las coordenadas iniciales y tamaños de las celdas
      const startX = 50; // Coordenada X inicial
      const startY = doc.y; // Coordenada Y inicial basada en la posición actual
      const cellWidth = 250;
      const cellHeight = 20;

      // Dibujar las celdas y el contenido
      const drawRow = (x: number, y: number, data: string[]) => {
        data.forEach((text, index) => {
          // Dibujar borde de la celda
          doc.rect(x + index * cellWidth, y, cellWidth, cellHeight).stroke();
          // Escribir el texto dentro de la celda
          doc.fontSize(12).text(text, x + index * cellWidth + 5, y + 5, {
            width: cellWidth - 10,
            height: cellHeight - 10,
            ellipsis: true,
          });
        });
      };

      // Encabezados
      drawRow(startX, startY, ['Campo', 'Valor']);
      let currentY = startY + cellHeight;

      // Filas de datos
      const rows = [
        ['Nombre', inventory.name || 'No disponible'],
        ['Marca', inventory.brand || 'No disponible'],
        ['Modelo', inventory.model || 'No disponible'],
        ['Número de serie', inventory.serialNumber || 'No disponible'],
        ['Ubicación', inventory.location || 'No disponible'],
        ['Fecha de compra', inventory.purchaseDate || 'No disponible'],
        ['Voltaje', inventory.voltage || 'No disponible'],
        ['Capacidad', inventory.capacity || 'No disponible'],
        [
          'Prioridad de mantenimiento',
          inventory.maintenancePriority || 'No disponible',
        ],
      ];

      rows.forEach((row) => {
        drawRow(startX, currentY, row);
        currentY += cellHeight;
      });

      // Finalizar el documento
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
