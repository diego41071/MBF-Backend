/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './equipment.schema';
import * as PDFDocument from 'pdfkit';
import { join } from 'path';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name)
    private equipmentModel: Model<EquipmentDocument>,
  ) { }

  // Crear un nuevo equipo con fotos y factura
  async create(
    data: Partial<Equipment>,
    photos?: Express.Multer.File[],
    invoice?: Express.Multer.File,
  ): Promise<Equipment> {
    const photoBuffers = photos?.map((file) => file.buffer) || [];
    const invoiceBuffer = invoice?.buffer || null;

    const newEquipment = new this.equipmentModel({
      ...data,
      photos: photoBuffers,
      invoice: invoiceBuffer,
    });
    return newEquipment.save();
  }

  // Obtener todos los equipos
  async findAll(): Promise<Equipment[]> {
    const equipments = await this.equipmentModel.find().exec();
    return equipments.map((equipment) => ({
      ...equipment.toObject(),
      invoice: equipment.invoice
        ? equipment.invoice.toString('base64') // Convertir factura a Base64
        : null,
    }));
  }

  // Obtener un equipo por su ID
  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment) {
      throw new NotFoundException('Equipo no encontrado');
    }
    return equipment;
  }

  async getPhotos(id: string): Promise<Buffer[]> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment || !equipment.photos) {
      throw new NotFoundException('Fotos no encontradas');
    }
    return equipment.photos;
  }

  async getInvoice(id: string): Promise<string> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment || !equipment.invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Convertir el Buffer de la factura a Base64
    return (equipment.invoice as Buffer).toString('base64');
  }

  // Actualizar un equipo
  async update(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const updatedEquipment = await this.equipmentModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updatedEquipment) {
      throw new NotFoundException('Equipo no encontrado');
    }
    return updatedEquipment;
  }

  // Eliminar un equipo
  async delete(id: string): Promise<void> {
    const result = await this.equipmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Equipo no encontrado');
    }
  }

  async generatePDF(equipment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));
      // **Definir columnas**
      const pageWidth = doc.page.width - 100; // Ancho total (descontando márgenes)
      const leftColWidth = pageWidth * 0.3; // 30% para la imagen
      const rightColWidth = pageWidth * 0.7; // 70% para el texto
      const marginX = 50; // Margen izquierdo

      // **1. Agregar imagen en la columna izquierda (30%)**
      try {
        const imagePath = join(__dirname, '..', 'assets', 'logo.png');
        doc.image(imagePath, marginX, 50, { width: leftColWidth - 10 });

        // **Calcular posición para el texto debajo de la imagen**
        const imageHeight = leftColWidth - 10; // La altura de la imagen (igual al ancho en este caso)
        const textY = 50 + imageHeight + 10; // 50 (posición Y inicial) + altura imagen + espacio extra

        doc
          .fontSize(12)
          .text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S', marginX, textY, {
            width: leftColWidth - 10,
            align: 'center',
          });

        doc.fontSize(10).text('NIT: 901.561.138-2', marginX, textY + 50, {
          width: leftColWidth - 10,
          align: 'center',
        });

        doc.fontSize(10).text('RESPONSABLE DE IVA', marginX, textY + 60, {
          width: leftColWidth - 10,
          align: 'center',
        });
        doc.fontSize(10).text('APROBACION DEL CLIENTE:', marginX, textY + 80, {
          width: leftColWidth - 10,
          align: 'center',
        });
        const cellWidth = 40; // Ancho de cada celda
        const cellHeight = 20; // Alto de cada celda
        const cellY = textY + 110; // Posición Y de las celdas

        const offsetX = 20; // Ajuste en el eje X

        // **Dibujar la celda "SI"**
        doc.rect(marginX + 10 + offsetX, cellY, cellWidth, cellHeight).stroke(); // Dibuja el rectángulo
        doc.fontSize(10).text('SI', marginX + 10 + offsetX, cellY + 5, {
          width: cellWidth,
          align: 'center',
        });

        // **Dibujar la celda "NO"**
        doc
          .rect(marginX + cellWidth + 10 + offsetX, cellY, cellWidth, cellHeight)
          .stroke(); // Dibuja el rectángulo
        doc.fontSize(10).text('NO', marginX + cellWidth + 10 + offsetX, cellY + 5, {
          width: cellWidth,
          align: 'center',
        });

        doc.fontSize(10).text('FECHA AUTORIZACIÓN: ', marginX, cellY + 25, {
          width: cellWidth + 80,
          align: 'center',
        });
        doc.fontSize(10).text('fecha', marginX, cellY + 50, {
          width: cellWidth + 80,
          align: 'center',
        });
        doc
          .fontSize(10)
          .text('FECHA ENTREGA AL CLIENTE: ', marginX, cellY + 35, {
            width: cellWidth + 80,
            align: 'center',
          });
        doc
          .fontSize(10)
          .text('Cra 45D #60-72, Medellín, Colombia', marginX, textY + 170, {
            width: leftColWidth - 10,
            align: 'center',
          });

        doc.fontSize(10).text('Tel: +57 304 130 1189', marginX, textY + 200, {
          width: leftColWidth - 10,
          align: 'center',
        });

        doc.fontSize(10).text('www.medibasculas.com', marginX, textY + 220, {
          width: leftColWidth - 10,
          align: 'center',
        });
      } catch (error) {
        console.error('Error al cargar la imagen:', error.message);
      }

      // **2. Dibujar línea vertical divisoria**
      const lineX = marginX + leftColWidth + 5; // Posición X de la línea
      doc
        .moveTo(lineX, 40) // Punto de inicio
        .lineTo(lineX, doc.page.height - 50) // Punto de fin
        .lineWidth(1) // Grosor de la línea
        .strokeColor('#000') // Color negro
        .stroke(); // Dibujar la línea

      // **2. Agregar contenido en la columna derecha (70%)**
      const contentX = marginX + leftColWidth + 30; // Inicia después de la imagen
      let contentY = 50;

      const text = `FECHA DE INGRESO: ${new Date().toLocaleDateString('es-ES')} RECEPCIÓN EQUIPO RE-0496`;
      const textX = contentX;
      const textY = contentY;

      // **Dibujar el texto**
      doc.fontSize(10).text(text, textX, textY, {
        width: rightColWidth,
        align: 'left',
      });

      contentY += 30;

      // Texto a mostrar
      const textTitle = `HOJA DE CONTRATO DE SERVICIO: `;
      const textXTitle = contentX;
      const textYTitle = contentY;

      // **Dibujar el texto centrado**
      doc.fontSize(12).text(textTitle, textXTitle, textYTitle, {
        width: rightColWidth,
        align: 'center',
      });

      // **Obtener el ancho del texto para la línea**
      const textWidthTitle = doc.widthOfString(textTitle);
      const textHeightTitle = doc.currentLineHeight(); // Altura del texto

      // **Calcular la posición X para centrar la línea**
      const centerX = textXTitle + (rightColWidth - textWidthTitle) / 2;

      // **Dibujar la línea centrada debajo del texto**
      doc
        .moveTo(centerX, textYTitle + textHeightTitle + 2) // Punto de inicio (centrado)
        .lineTo(centerX + textWidthTitle, textYTitle + textHeightTitle + 2) // Punto final
        .lineWidth(1) // Grosor de la línea
        .strokeColor('#000') // Color negro
        .stroke(); // Dibujar la línea



      contentY += 40;

      // **3. Datos del Cliente**
      doc.fontSize(14).text('DATOS DEL CLIENTE', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc
        .fontSize(12)
        .text(
          `NOMBRE: ${equipment.clientName || 'No disponible'}`,
          contentX,
          contentY,
        );
      contentY += 15;
      doc.text(
        `C.C / NIT: ${equipment.clientId || 'No disponible'}`,
        contentX,
        contentY,
      );
      contentY += 15;
      doc.text(
        `DIRECCIÓN: ${equipment.clientAddress || 'No disponible'}`,
        contentX,
        contentY,
      );
      contentY += 15;
      doc.text(
        `TEL/CEL: ${equipment.clientPhone || 'No disponible'}`,
        contentX,
        contentY,
      );
      contentY += 15;
      doc.text(
        `CONTACTO: ${equipment.clientContact || 'No disponible'}`,
        contentX,
        contentY,
      );

      contentY += 30;

      // **4. Datos del Equipo**
      doc.fontSize(14).text('DATOS DEL EQUIPO', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc.fontSize(12).text(`EQUIPO: ${equipment.name}`, contentX, contentY);
      contentY += 15;
      doc.text(`MARCA: ${equipment.brand}`, contentX, contentY);
      contentY += 15;
      doc.text(`MODELO: ${equipment.model}`, contentX, contentY);
      contentY += 15;
      doc.text(`SERIAL: ${equipment.serial || 'N/A'}`, contentX, contentY);
      contentY += 15;
      doc.text(
        `ACCESORIOS: ${equipment.accessories || 'No disponible'}`,
        contentX,
        contentY,
      );
      contentY += 15;
      doc.text(
        `DEFECTOS: ${equipment.issue || 'No especificado'}`,
        contentX,
        contentY,
      );

      contentY += 30;

      // **5. Ficha Técnica**
      doc.fontSize(14).text('FICHA TÉCNICA', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc
        .fontSize(12)
        .text(
          `FALLA REPORTADA POR EL CLIENTE: ${equipment.issue || 'No especificado'}`,
          contentX,
          contentY,
        );

      contentY += 30;

      // **6. Diagnóstico Técnico**
      doc.fontSize(14).text('DIAGNÓSTICO TÉCNICO', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc
        .fontSize(12)
        .text(
          equipment.diagnosis || 'Pendiente de revisión.',
          contentX,
          contentY,
        );

      contentY += 30;

      // **8. Términos y Condiciones**
      doc
        .fontSize(14)
        .text('TÉRMINOS Y CONDICIONES DE SERVICIO', contentX, contentY, {
          width: rightColWidth,
          underline: true,
        });
      contentY += 20;

      doc
        .fontSize(10)
        .text(
          '1. No nos hacemos responsables por fallas ocultas no declaradas por el cliente... \n' +
          '2. La empresa no se hace responsable por equipos dejados más de 30 días... \n' +
          '3. La garantía cubre solo la pieza reparada... \n' +
          '4. Se comenzará a cobrar un 3% por día después de 10 días sin retiro del equipo...',
          contentX,
          contentY,
          { width: rightColWidth },
        );

      contentY += 60;

      // **9. Firma del Cliente**
      doc
        .fontSize(12)
        .text(
          'Firma del cliente: ____________________________',
          contentX,
          contentY,
        );

      // **Finalizar PDF**
      doc.end();
    });
  }
}
