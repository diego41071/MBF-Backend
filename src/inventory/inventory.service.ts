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
import formatDate from 'src/utils/formatDate';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
  ) { }

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
      const logoY = cellY + (75 - logoHeight) / 2;

      try {
        const imagePath = join(__dirname, '..', 'assets', 'logo.png');
        doc.image(imagePath, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
        });
      } catch (error) {
        console.error('Error al cargar la imagen:', error.message);
      }

      doc.font('Helvetica-Bold').fontSize(8).text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S.', 43, 40, {
        align: 'center',
        width: 500,
      });
      doc.font('Helvetica').fontSize(8).text('Whatsapp 304 1301189', 40, 55, {
        align: 'center',
        width: 500,
      });
      doc.fontSize(8).text('serviciotecnico@medibasculas.com', 40, 70, {
        align: 'center',
        width: 500,
      });
      doc.fontSize(8).text('CRA 45D #60-72, Medellín, Antioquia', 40, 85, {
        align: 'center',
        width: 500,
      });

      // Sección derecha de la cabecera
      const cellHeightRight = 19;
      const labelWidth = 100;
      const valueWidth = 60;
      const startXRight = 405;
      let startYRight = 30;

      // Función para dibujar una celda con texto
      const drawCell = (label: string, value: string, x: number, y: number) => {
        doc.rect(x, y, labelWidth, cellHeightRight).stroke(); // Celda del título
        doc.font("Helvetica-Bold").text(label, x + 5, y + 5, {
          width: labelWidth - 10,
          align: 'center',
        });

        doc.rect(x + labelWidth, y, valueWidth, cellHeightRight).stroke(); // Celda del valor
        doc.font("Helvetica").text(value, x + labelWidth + 5, y + 5, {
          width: valueWidth - 10,
          align: 'center',
        });
      };

      // Dibujar las celdas con los datos
      drawCell('FICHA TÉCNICA:', 'FT-145', startXRight, startYRight);
      startYRight += cellHeightRight;
      drawCell('FECHA SERVICIO:', '23/11/2023', startXRight, startYRight);
      startYRight += cellHeightRight;
      drawCell('PRÓXIMO SERVICIO:', '23/05/2024', startXRight, startYRight);
      startYRight += cellHeightRight;
      drawCell('PRIORIDAD:', 'ALTA', startXRight, startYRight);

      // Datos generales en formato 2x2
      let currentY = 120;
      const cellHeight = 20;
      const columnWidth = 130; // Ahora hay solo 2 columnas
      const startX = 51;
      const offsetX = 130; // Desplazamiento extra para "Marca"

      const generalData = [
        ['Nombre del Equipo', inventory.name || 'No disponible'],
        ['Marca', inventory.brand || 'No disponible'],
        ['Modelo', inventory.model || 'No disponible'],
        ['Serie', inventory.serialNumber || 'No disponible'],
        [
          'Fecha de Compra',
          formatDate(inventory.purchaseDate) || 'No disponible',
        ],
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

        // Centrar el texto en la celda
        const textWidth1 = doc.widthOfString(row[0]);
        const textWidth2 = doc.widthOfString(row[1]);

        const textX1 = x + (columnWidth - textWidth1) / 2;
        const textX2 = x + columnWidth + (columnWidth - textWidth2) / 2;

        const textY = y + (cellHeight - 10) / 2; // Ajuste vertical simple

        doc.font("Helvetica-Bold").text(row[0], textX1, textY);
        doc.rect(x + columnWidth, y, columnWidth, cellHeight).stroke();
        doc.font("Helvetica").text(row[1], textX2, textY);
      });

      // Ajustar la posición después de la tabla 2x2
      currentY += Math.ceil(generalData.length / 2) * cellHeight + 20;

      // Especificaciones técnicas
      const cellHeightSpec = 25;
      const columnWidths = [150, 300, 70]; // Ancho de cada celda
      const startXspec = 50;
      let currentYspec = 260; // Ajusta según sea necesario

      // Dibujar celdas y texto para la cabecera de Especificaciones Técnicas
      doc
        .rect(startXspec, currentYspec, columnWidths[0], cellHeightSpec)
        .stroke();
      doc.font("Helvetica-Bold").text('Especificaciones Técnicas', startXspec + 5, currentYspec + 7, {
        width: columnWidths[0] - 10,
        align: 'center',
      });

      doc
        .rect(
          startXspec + columnWidths[0],
          currentYspec,
          columnWidths[1],
          cellHeightSpec,
        )
        .stroke();
      doc.text(
        'Tecnología Predominante',
        startXspec + columnWidths[0] + 5,
        currentYspec + 7,
        { width: columnWidths[1] - 10, align: 'center' },
      );

      doc
        .rect(
          startXspec + columnWidths[0] + columnWidths[1],
          currentYspec,
          columnWidths[2],
          cellHeightSpec,
        )
        .stroke();
      doc.text(
        'Uso',
        startXspec + columnWidths[0] + columnWidths[1] + 5,
        currentYspec + 7,
        { width: columnWidths[2] - 10, align: 'center' },
      );

      // Aumentar la posición Y para continuar con más contenido si es necesario

      currentY += 25;

      const specifications = [
        ['Capacidad', inventory.capacity || 'No disponible'],
        ['Material', inventory.material || 'No disponible'],
      ];

      specifications.forEach((row) => {
        const cellWidth = 75;
        const cellHeight = 20;

        doc.rect(50, currentY, cellWidth, cellHeight).stroke();
        doc.rect(125, currentY, cellWidth, cellHeight).stroke();

        // Obtener el ancho de los textos
        const textWidth1 = doc.widthOfString(row[0]);
        const textWidth2 = doc.widthOfString(row[1]);

        // Calcular la posición X centrada dentro de la celda
        const textX1 = 50 + (cellWidth - textWidth1) / 2;
        const textX2 = 125 + (cellWidth - textWidth2) / 2;

        // Calcular la posición Y centrada dentro de la celda (ajustado para altura de texto)
        const textY = currentY + (cellHeight - 10) / 2;

        doc.font("Helvetica-Bold").text(row[0], textX1, textY);
        doc.font("Helvetica").text(row[1], textX2, textY);

        currentY += cellHeight;
      });

      const cellXcell = 200; // Posición X de la celda
      const cellYcell = 305; // Posición Y de la celda
      const cellWidth = 150; // Ancho de la celda
      const cellHeightcell = 20; // Alto de la celda
      const text = 'Dimenciones del equipo';

      // Dibujar la celda
      doc.rect(cellXcell, cellYcell, cellWidth, cellHeightcell).stroke();

      // Calcular el ancho del texto
      const textWidth = doc.widthOfString(text);
      const textHeight = 10; // Aproximado, ya que PDFKit no da altura exacta

      // Calcular posición centrada
      const textX = cellXcell + (cellWidth - textWidth) / 2;
      const textY = cellYcell + (cellHeightcell - textHeight) / 2;

      // Agregar el texto centrado
      doc.text(text, textX, textY);

      const cellXsize = 350; // Posición X de la celda
      const cellYsize = 305; // Posición Y de la celda
      const cellWidthsize = 150; // Ancho de la celda
      const cellHeightsize = 20; // Alto de la celda
      const textsize = '40x30x10cm';

      // Dibujar la celda
      doc.rect(cellXsize, cellYsize, cellWidthsize, cellHeightsize).stroke();

      // Calcular el ancho del texto
      const textWidthsize = doc.widthOfString(textsize);
      const textHeightsize = 10; // Estimación de altura del texto

      // Calcular posición centrada
      const textXsize = cellXsize + (cellWidthsize - textWidthsize) / 2;
      const textYsize = cellYsize + (cellHeightsize - textHeightsize) / 2;

      // Agregar el texto centrado
      doc.text(textsize, textXsize, textYsize);

      // Posición inicial
      const startY = 286;

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
        const cellWidth = 35;
        const cellHeightcell = 20;
        const startXcell = 500; // Ajusta la posición según sea necesario
        const startYcell = 286;

        // Celda para "Fijo"
        doc.rect(startXcell, startYcell, cellWidth, cellHeightcell).stroke();
        doc.fontSize(10).text('Fijo', startXcell + 5, startYcell + 5, {
          width: cellWidth - 10,
          align: 'center',
        });

        // Celda para "Móvil"
        doc
          .rect(startXcell + cellWidth, startYcell, cellWidth, cellHeightcell)
          .stroke();
        doc
          .fontSize(10)
          .text('Móvil', startXcell + cellWidth + 5, startYcell + 5, {
            width: cellWidth - 10,
            align: 'center',
          });
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
