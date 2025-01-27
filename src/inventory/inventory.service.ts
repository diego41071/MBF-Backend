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

      // // Crear encabezado principal
      // doc.image('path/to/logo.png', 50, 30, { width: 50 }); // Agrega el logo (ajusta la ruta)
      // Dibujar el recuadro
      doc.rect(50, 30, 500, 60).stroke(); // Rectángulo con posición (x: 50, y: 30), ancho: 500, alto: 60

      // Escribir el texto dentro del recuadro
      doc.fontSize(12).text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S.', 0, 40, {
        align: 'center',
        width: 500, // Ajustar el ancho al tamaño del recuadro
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

      // Sección derecha de la cabecera con texto ajustado
      doc.rect(400, 30, 150, 60).stroke();

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
      doc.moveDown(1.5);
      doc.fontSize(10).text('Nombre del Equipo:', 50, 120);
      doc.text(inventory.name || 'No disponible', 180, 120);
      doc.text('Marca:', 50, 135);
      doc.text(inventory.brand || 'No disponible', 180, 135);
      doc.text('Modelo:', 50, 150);
      doc.text(inventory.model || 'No disponible', 180, 150);
      doc.text('Serie:', 50, 165);
      doc.text(inventory.serialNumber || 'No disponible', 180, 165);
      doc.text('Fecha de Compra:', 50, 180);
      doc.text(inventory.purchaseDate || 'No disponible', 180, 180);

      // Especificaciones técnicas
      const startY = 200; // Posición Y inicial para las tablas
      doc.rect(50, startY, 500, 20).stroke(); // Título de la tabla
      doc.text('Especificaciones Técnicas', 55, startY + 5);

      // Dibujar celdas de la tabla
      const rows = [
        ['Capacidad', `${inventory.capacity || 'No disponible'}`],
        ['Material', `${inventory.material || 'No disponible'}`],
        ['Voltaje del Equipo', `${inventory.voltage || 'No disponible'}`],
        ['Peso del Equipo', `${inventory.weight || 'No disponible'}`],
        ['Potencia del Equipo', `${inventory.power || 'No disponible'}`],
      ];

      let currentY = startY + 25;
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
