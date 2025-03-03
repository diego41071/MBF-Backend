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
      doc.rect(50, 30, 520, 75).stroke();

      // Logo y empresa
      const cellX = 50;
      const cellY = 30;
      const headerCellWidth = 130;

      doc
        .fillColor('#f0f0f0') // Color de fondo (gris claro)
        .rect(cellX, cellY, headerCellWidth, 75)
        .fill();
      // Si quieres también un borde, añade `stroke()`
      doc
        .strokeColor('black') // Color del borde
        .lineWidth(1) // Grosor del borde
        .rect(cellX, cellY, headerCellWidth, 75)
        .stroke(); // Dibuja el borde
      doc.fillColor('black');

      const logoWidth = 60;
      const logoHeight = 60;
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

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S.', 43, 40, {
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
      const cellHeightRight = 18.5;
      const labelWidth = 100;
      const valueWidth = 65;
      const startXRight = 405;
      let startYRight = 30;

      const drawCell = (label: string, value: string, x: number, y: number) => {
        // Dibujar el fondo de la celda del título
        doc
          .save()
          .fillColor('#f0f0f0') // Color de fondo gris claro
          .rect(x, y, labelWidth, cellHeightRight)
          .fill()
          .restore(); // Restaurar configuración de color para evitar afectar el texto

        // Dibujar el fondo de la celda del valor (opcional, si quieres un fondo distinto)
        doc
          .save()
          .fillColor('white') // Fondo blanco para la celda de valor
          .rect(x + labelWidth, y, valueWidth, cellHeightRight)
          .fill()
          .restore();

        // Dibujar los bordes de ambas celdas
        doc.rect(x, y, labelWidth, cellHeightRight).stroke();
        doc.rect(x + labelWidth, y, valueWidth, cellHeightRight).stroke();

        // Escribir el texto en la celda del título
        doc
          .font('Helvetica-Bold')
          .fillColor('black') // Asegurar color negro para el texto
          .text(label, x + 5, y + 7, {
            width: labelWidth - 10,
            align: 'center',
          });

        // Escribir el texto en la celda del valor
        doc.font('Helvetica').text(value, x + labelWidth + 5, y + 7, {
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
      drawCell(
        'PRIORIDAD:',
        inventory.maintenancePriority.toUpperCase(),
        startXRight,
        startYRight,
      );

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
          row[0] === 'Última Revisión'
            ? offsetX
            : 0;

        const x = startX + col * columnWidth + extraOffset;
        const y = currentY + rowNumber * cellHeight;

        doc
          .save()
          .fillColor('#f0f0f0')
          .rect(x, y, columnWidth, cellHeight)
          .fill()
          .restore()
          .stroke();
        doc.rect(x, y, columnWidth, cellHeight).stroke();

        // Centrar el texto en la celda
        const textWidth1 = doc.widthOfString(row[0]);
        const textWidth2 = doc.widthOfString(row[1]);

        const textX1 = x + (columnWidth - textWidth1) / 2;
        const textX2 = x + columnWidth + (columnWidth - textWidth2) / 2;

        const textY = y + (cellHeight - 6) / 2; // Ajuste vertical simple

        doc.font('Helvetica-Bold').text(row[0], textX1, textY);
        doc.rect(x + columnWidth, y, columnWidth, cellHeight).stroke();
        doc.font('Helvetica').text(row[1], textX2, textY);
      });

      const cellXVolt = startX; // Posición X de la primera celda
      const cellYVolt = currentY + 80; // Posición Y de la celda
      const titleCellWidth = 116; // Ancho de las celdas de títulos
      const dataCellWidth = 53; // Ancho estándar de las celdas de datos
      const specialDataCellWidth = 65; // 🔹 Ancho especial solo para "1A"
      const cellHeightVolt = 20; // Alto de todas las celdas

      // Textos para cada celda (pares = títulos, impares = datos)
      const cellTexts = [
        'Voltaje del Equipo',
        inventory.voltage, //poner valor dinamico
        'Peso del Equipo',
        inventory.weight,
        'Potencia del Equipo',
        inventory.power,
      ];

      let currentX = cellXVolt; // Variable para llevar la posición en X

      cellTexts.forEach((text, index) => {
        const isTitle = index % 2 === 0; // Identifica si es un título
        const isSpecialCell = index === cellTexts.length - 1; // 🔹 Solo la celda "1A"
        const cellWidth = isTitle
          ? titleCellWidth
          : isSpecialCell
            ? specialDataCellWidth // 🔹 Usa ancho mayor solo para "1A"
            : dataCellWidth;

        // Si es un título, dibujar fondo gris
        if (isTitle) {
          doc
            .rect(currentX, cellYVolt, cellWidth, cellHeightVolt)
            .fill('#f0f0f0'); // Fondo gris
        }

        // Dibujar la celda con borde
        doc.rect(currentX, cellYVolt, cellWidth, cellHeightVolt).stroke();

        // Configurar fuente y color
        doc.fillColor('black').font('Helvetica');

        doc.font(isTitle ? 'Helvetica-Bold' : 'Helvetica'); // 🔹 Negrita si es título

        // 🔹 Centrar texto horizontal y verticalmente
        doc.text(text, currentX, cellYVolt + cellHeightVolt / 3, {
          width: cellWidth, // 🔹 Ajusta el ancho al de la celda
          align: 'center', // 🔹 Centra horizontalmente
        });

        // Mover X para la siguiente celda
        currentX += cellWidth;
      });

      // Ajustar la posición después de la tabla 2x2
      currentY += Math.ceil(generalData.length / 2) * cellHeight + 20;

      // Especificaciones técnicas
      // Definir la posición inicial del contenedor
      let containerY = 237; // Ajusta este valor para mover todo el bloque

      const cellHeightSpec = 25;
      const columnWidths = [150, 300, 70]; // Ancho de cada celda
      const startXspec = 50;
      let currentYspec = containerY; // Se usa containerY en lugar de un valor fijo

      // Dibujar celdas y texto para la cabecera de Especificaciones Técnicas
      doc
        .save()
        .fillColor('#f0f0f0')
        .rect(startXspec, currentYspec, columnWidths[0], cellHeightSpec)
        .fill()
        .restore()
        .stroke();

      doc
        .rect(startXspec, currentYspec, columnWidths[0], cellHeightSpec)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .text('Especificaciones Técnicas', startXspec + 5, currentYspec + 9, {
          width: columnWidths[0] - 10,
          align: 'center',
        });

      doc
        .save()
        .fillColor('#f0f0f0')
        .rect(
          startXspec + columnWidths[0],
          currentYspec,
          columnWidths[1],
          cellHeightSpec,
        )
        .fill()
        .restore();
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
        currentYspec + 9,
        { width: columnWidths[1] - 10, align: 'center' },
      );

      doc
        .save()
        .fillColor('#f0f0f0')
        .rect(
          startXspec + columnWidths[0] + columnWidths[1],
          currentYspec,
          columnWidths[2],
          cellHeightSpec,
        )
        .fill()
        .restore();

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
        currentYspec + 9,
        { width: columnWidths[2] - 10, align: 'center' },
      );

      const specifications = [
        ['Capacidad', inventory.capacity || 'No disponible'],
        ['Material', inventory.material || 'No disponible'],
      ];

      specifications.forEach((row) => {
        const cellWidth = 75;
        const cellHeight = 20;

        doc
          .save()
          .fillColor('#f0f0f0')
          .rect(50, containerY + cellHeight + 4, cellWidth, cellHeight)
          .fill()
          .restore();

        doc
          .rect(50, containerY + cellHeight + 4, cellWidth, cellHeight)
          .stroke();
        doc
          .rect(125, containerY + cellHeight + 4, cellWidth, cellHeight)
          .stroke();

        // Obtener el ancho de los textos
        const textWidth1 = doc.widthOfString(row[0]);
        const textWidth2 = doc.widthOfString(row[1]);

        // Calcular la posición X centrada dentro de la celda
        const textX1 = 50 + (cellWidth - textWidth1) / 2;
        const textX2 = 125 + (cellWidth - textWidth2) / 2;

        // Calcular la posición Y centrada dentro de la celda (ajustado para altura de texto)
        const textY = containerY + (cellHeight - 6) / 2;

        doc.font('Helvetica-Bold').text(row[0], textX1, textY + cellHeight + 4);
        doc.font('Helvetica').text(row[1], textX2, textY + cellHeight + 4);

        containerY += cellHeight;
      });

      const cellXcell = 200;
      const cellWidth = 150;
      const cellHeightcell = 20;
      const text = 'Dimensiones del equipo';
      const cellYcell = containerY + 4;

      // Dibujar la celda
      doc
        .save()
        .fillColor('#f0f0f0')
        .rect(cellXcell, cellYcell, cellWidth, cellHeightcell)
        .fill()
        .restore();

      doc.rect(cellXcell, cellYcell, cellWidth, cellHeightcell).stroke();

      // Calcular el ancho del texto
      const textWidth = doc.widthOfString(text);
      const textHeight = 5;

      const textX = cellXcell + (cellWidth - textWidth) / 2;
      const textY = cellYcell + (cellHeightcell - textHeight) / 2;

      doc.font('Helvetica-Bold').text(text, textX, textY);

      const cellXsize = 350;
      const cellYsize = containerY + 4;
      const cellWidthsize = 150;
      const cellHeightsize = 20;
      const textsize = '40x30x10cm';

      // Dibujar la celda
      doc.rect(cellXsize, cellYsize, cellWidthsize, cellHeightsize).stroke();

      const textWidthsize = doc.widthOfString(textsize);
      const textHeightsize = 5;

      const textXsize = cellXsize + (cellWidthsize - textWidthsize) / 2;
      const textYsize = cellYsize + (cellHeightsize - textHeightsize) / 2;

      doc.font('Helvetica').text(textsize, textXsize, textYsize);

      // Posición inicial
      const startY = containerY - 16;

      // Datos para la tabla
      const data = [
        'Mecánico',
        'Eléctrico',
        'Hidráulico',
        'Electrónico',
        'Neumático',
      ];

      data.forEach((text, index) => {
        const x = 200 + index * 60;

        doc.rect(x, startY, 60, cellHeight).stroke();

        const textWidth = doc.widthOfString(text);
        const textHeight = doc.currentLineHeight();

        const textX = x + (60 - textWidth) / 2;
        const textY = startY + (18 - textHeight) / 2;

        doc.text(text, textX, textY);
        const cellWidth = 35;
        const cellHeightcell = 39;
        const startXcell = 500;
        const startYcell = startY;

        if (
          inventory.technology ===
          text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        ) {
          doc
            .moveTo(x, startY)
            .lineTo(x + 60, startY + cellHeight)
            .stroke();
          doc
            .moveTo(x + 60, startY)
            .lineTo(x, startY + cellHeight)
            .stroke();
        }

        doc
          .rect(startXcell, startYcell + 1, cellWidth, cellHeightcell)
          .stroke();
        if (inventory.usage === 'Fijo') {
          doc
            .moveTo(startXcell, startYcell)
            .lineTo(startXcell + cellWidth, startYcell + cellHeightcell)
            .stroke();
          doc
            .moveTo(startXcell + cellWidth, startYcell)
            .lineTo(startXcell, startYcell + cellHeightcell)
            .stroke();
        }
        doc
          .font('Helvetica')
          .fontSize(8)
          .text('Fijo', startXcell + 5, startYcell + 17, {
            width: cellWidth - 10,
            align: 'center',
          });

        // Dibujar la celda de "Móvil"
        doc
          .rect(
            startXcell + cellWidth,
            startYcell + 1,
            cellWidth,
            cellHeightcell,
          )
          .stroke();

        // Texto "Móvil"
        doc
          .font('Helvetica')
          .fontSize(8)
          .text('Móvil', startXcell + cellWidth + 5, startYcell + 17, {
            width: cellWidth - 10,
            align: 'center',
          });

        // ✅ Si el valor es "Móvil", dibujar las líneas cruzadas en la celda
        if (inventory.usage === 'Movil') {
          doc
            .moveTo(startXcell + cellWidth, startYcell) // Esquina superior izquierda de la celda
            .lineTo(startXcell + 2 * cellWidth, startYcell + cellHeightcell) // Esquina inferior derecha
            .stroke();

          doc
            .moveTo(startXcell + 2 * cellWidth, startYcell) // Esquina superior derecha
            .lineTo(startXcell + cellWidth, startYcell + cellHeightcell) // Esquina inferior izquierda
            .stroke();
        }

        doc
          .font('Helvetica')
          .fontSize(8)
          .text('Móvil', startXcell + cellWidth + 5, startYcell + 17, {
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
