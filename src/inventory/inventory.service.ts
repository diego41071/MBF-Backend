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

      // Encabezado principal
      doc.rect(50, 30, 515, 75).stroke(); // Rectángulo superior
      doc.fontSize(12).text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S.', 0, 40, {
        align: 'center',
        width: 500,
      });
      doc
        .fontSize(10)
        .text(
          'Whatsapp 304 1301189 | serviciotecnico@medibasculas.com',
          0,
          55,
          {
            align: 'center',
            width: 500,
          },
        );
      doc.fontSize(10).text('CRA 45D #60-72, Medellín, Antioquia', 0, 70, {
        align: 'center',
        width: 500,
      });

      // Sección derecha de la cabecera
      doc.rect(400, 30, 165, 75).stroke();
      doc
        .fontSize(10)
        .text('FICHA TÉCNICA', 405, 35, { width: 180, align: 'left' });
      doc.fontSize(10).text('FT-145', 405, 50, { width: 180, align: 'left' });
      doc.text('FECHA SERVICIO: 23/11/2023', 405, 65, {
        width: 180,
        align: 'left',
      });
      doc.text('PRÓXIMO SERVICIO: 23/05/2024', 405, 80, {
        width: 180,
        align: 'left',
      });
      doc.text('PRIORIDAD: ALTA', 405, 95, { width: 180, align: 'left' });

      // Datos generales
      const startY = 120; // Y inicial para datos generales
      let currentY = startY;

      const cellHeight = 20; // Altura de cada celda
      const cellWidthLabel = 130; // Ancho de la celda para la etiqueta
      const cellWidthValue = 320; // Ancho de la celda para el valor

      // Función para dibujar una fila en celdas
      const drawRow = (y: number, label: string, value: string) => {
        // Celda de la etiqueta
        doc.rect(50, y, cellWidthLabel, cellHeight).stroke();
        doc.text(label, 55, y + 5, {
          width: cellWidthLabel - 10,
          align: 'left',
        });

        // Celda del valor
        doc.rect(50 + cellWidthLabel, y, cellWidthValue, cellHeight).stroke();
        doc.text(value, 55 + cellWidthLabel, y + 5, {
          width: cellWidthValue - 10,
          align: 'left',
        });
      };

      // Dibujar las filas para los datos generales
      drawRow(
        currentY,
        'Nombre del Equipo:',
        inventory.name || 'No disponible',
      );
      currentY += cellHeight;
      drawRow(currentY, 'Marca:', inventory.brand || 'No disponible');
      currentY += cellHeight;
      drawRow(currentY, 'Modelo:', inventory.model || 'No disponible');
      currentY += cellHeight;
      drawRow(currentY, 'Serie:', inventory.serialNumber || 'No disponible');
      currentY += cellHeight;
      drawRow(
        currentY,
        'Fecha de Compra:',
        inventory.purchaseDate || 'No disponible',
      );

      // Especificaciones técnicas
      currentY += 20; // Espacio adicional antes de la siguiente sección
      doc.rect(50, currentY, 500, 20).stroke(); // Título de la tabla
      doc.text('Especificaciones Técnicas', 55, currentY + 5);
      currentY += 25;

      const rows = [
        ['Capacidad', `${inventory.capacity || 'No disponible'}`],
        ['Material', `${inventory.material || 'No disponible'}`],
        ['Voltaje del Equipo', `${inventory.voltage || 'No disponible'}`],
        ['Peso del Equipo', `${inventory.weight || 'No disponible'}`],
        ['Potencia del Equipo', `${inventory.power || 'No disponible'}`],
      ];

      rows.forEach((row) => {
        doc.rect(50, currentY, 250, 20).stroke(); // Columna 1
        doc.text(row[0], 55, currentY + 5);
        doc.rect(300, currentY, 250, 20).stroke(); // Columna 2
        doc.text(row[1], 305, currentY + 5);
        currentY += 20;
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
