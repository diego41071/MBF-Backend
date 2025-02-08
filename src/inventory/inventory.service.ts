/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';
import * as PDFDocument from 'pdfkit';
import { join } from 'path';

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

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Encabezado principal
      doc.rect(50, 30, 515, 75).stroke();

      // Logo y empresa
      const cellX = 50;
      const cellY = 30;
      const headerCellWidth = 130;

      doc.rect(cellX, cellY, headerCellWidth, 75).stroke();

      const logoWidth = 40;
      const logoHeight = 40;
      const logoX = cellX + (headerCellWidth - logoWidth) / 2;
      const logoY = cellY + (50 - logoHeight) / 2;

      try {
        const imagePath = join(__dirname, '..', 'assets', 'logo.png');
        doc.image(imagePath, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
        });
      } catch (error) {
        console.error('Error al cargar la imagen:', error.message);
      }

      doc.fontSize(8).text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S.', 40, 40, {
        align: 'center',
        width: 500,
      });
      doc.fontSize(8).text('Whatsapp 304 1301189', 40, 55, {
        align: 'center',
        width: 500,
      });
      doc.fontSize(8).text('serviciotecnico@medibasculas.com', 40, 65, {
        align: 'center',
        width: 500,
      });
      doc.fontSize(8).text('CRA 45D #60-72, Medellín, Antioquia', 40, 75, {
        align: 'center',
        width: 500,
      });

      // Sección derecha de la cabecera
      doc.rect(400, 30, 165, 75).stroke();
      doc.fontSize(10).text('FICHA TÉCNICA:', 405, 35);
      doc.fontSize(10).text('FT-145', 500, 35);
      doc.text('FECHA SERVICIO:', 405, 55);
      doc.text('23/11/2023', 515, 55);
      doc.text('PRÓXIMO SERVICIO:', 405, 80);
      doc.text('23/05/2024', 515, 80);
      doc.text('PRIORIDAD:', 405, 95);
      doc.text('ALTA', 530, 95);

      // Datos generales en formato 2x2
      let currentY = 120;
      const cellHeight = 20;
      const columnWidth = 120; // Ahora hay solo 2 columnas
      const startX = 70;
      const offsetX = 140; // Desplazamiento extra para "Marca"

      const generalData = [
        ['Nombre del Equipo', inventory.name || 'No disponible'],
        ['Marca', inventory.brand || 'No disponible'],
        ['Modelo', inventory.model || 'No disponible'],
        ['Serie', inventory.serialNumber || 'No disponible'],
        ['Fecha de Compra', inventory.purchaseDate || 'No disponible'],
        ['Ubicación', inventory.location || 'No disponible'],
        ['Estado', inventory.status || 'No disponible'],
        ['Responsable', inventory.responsible || 'No disponible'],
        ['Proveedor', inventory.supplier || 'No disponible'],
        ['Garantía', inventory.warranty || 'No disponible'],
        ['Costo', inventory.cost || 'No disponible'],
        ['Última Revisión', inventory.lastReview || 'No disponible'],
      ];

      generalData.forEach((row, index) => {
        const col = index % 2; // Solo 2 columnas ahora
        const rowNumber = Math.floor(index / 2);
        const extraOffset =
          row[0] === 'Marca' ||
          row[0] === 'Serie' ||
          row[0] === 'Ubicación' ||
          row[0] === 'Responsable' ||
          row[0] === 'Garantía' ||
          row[0] === 'Última Revisión' ||
          row[0] === 'Notas Adicionales'
            ? offsetX
            : 0;

        const x = startX + col * columnWidth + extraOffset;
        const y = currentY + rowNumber * cellHeight;

        doc.rect(x, y, columnWidth, cellHeight).stroke();
        doc.text(row[0], x + 5, y + 5);
        doc.rect(x + columnWidth, y, columnWidth, cellHeight).stroke();
        doc.text(row[1], x + columnWidth + 5, y + 5);
      });

      // Ajustar la posición después de la tabla 2x2
      currentY += Math.ceil(generalData.length / 2) * cellHeight + 20;

      // Especificaciones técnicas
      doc.rect(50, currentY, 500, 20).stroke();
      doc.text('Especificaciones Técnicas', 55, currentY + 5);
      doc.text(' | Tecnologia Predominante', 200, currentY + 5);
      doc.text(' | Uso', 330, currentY + 5);
      currentY += 25;

      const specifications = [
        ['Capacidad', inventory.capacity || 'No disponible'],
        ['Material', inventory.material || 'No disponible'],
      ];

      specifications.forEach((row) => {
        doc.rect(50, currentY, 70, 20).stroke();
        doc.text(row[0], 55, currentY + 5);
        doc.rect(120, currentY, 70, 20).stroke();
        doc.text(row[1], 125, currentY + 5);
        currentY += 20;
      });
      // Posición inicial
      const startY = 300;

      // Datos para la tabla
      const data = [
        'Mecánico',
        'Eléctrico',
        'Hidráulico',
        'Eléctrico',
        'Neumático',
      ];

      // Establecer el tamaño de fuente
      doc.fontSize(12);

      // Dibujar las celdas y centrar el texto
      data.forEach((text, index) => {
        const x = 200 + index * 60;

        // Dibujar celda (rectángulo)
        doc.rect(x, startY, 60, cellHeight).stroke();

        // Obtener el ancho y alto del texto
        const textWidth = doc.widthOfString(text);
        const textHeight = doc.currentLineHeight();

        // Calcular la posición centrada dentro de la celda
        const textX = x + (60 - textWidth) / 2;
        const textY = startY + (30 - textHeight) / 2;

        // Agregar el texto centrado
        doc.text(text, textX, textY);
        doc.fontSize(10).text('Fijo', 530, 300, { width: 80, align: 'left' });
        doc.fontSize(10).text('Móvil', 550, 300, { width: 80, align: 'left' });
      });
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
