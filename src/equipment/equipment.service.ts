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
      const marginX = 35; // Margen izquierdo

      // **1. Agregar imagen en la columna izquierda (30%)**
      try {
        const imagePath = join(__dirname, '..', 'assets', 'logo1.png');
        doc.image(imagePath, marginX, 50, { width: leftColWidth - 10 });

        // **Calcular posición para el texto debajo de la imagen**
        const imageHeight = leftColWidth - 10; // La altura de la imagen (igual al ancho en este caso)
        const textY = 50 + imageHeight + 10; // 50 (posición Y inicial) + altura imagen + espacio extra

        doc.font("Helvetica-Bold")
          .fontSize(12)
          .text('IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S', marginX - 30, textY, {
            width: leftColWidth + 30,
            align: 'center',
          });

        doc.font("Helvetica").fontSize(10).text('NIT: 901.561.138-2', marginX, textY + 30, {
          width: leftColWidth - 10,
          align: 'center',
        });

        doc.fontSize(10).text('RESPONSABLE DE IVA', marginX, textY + 45, {
          width: leftColWidth - 10,
          align: 'center',
        });
        doc.fontSize(10).text('APROBACION DEL CLIENTE:', marginX, textY + 80, {
          width: leftColWidth - 10,
          align: 'center',
        });
        const cellWidth = 40; // Ancho de cada celda
        const cellHeight = 20; // Alto de cada celda
        const cellY = textY + 100; // Posición Y de las celdas

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

        doc.fontSize(10).text('FECHA AUTORIZACIÓN: ', marginX + 12, cellY + 35, {
          width: cellWidth + 80,
          align: 'center',
        });

        const tableX = marginX + 18; // Posición X de la tabla
        const tableY = cellY + 50; // Posición Y de la tabla
        const cellWidthDate = 100; // Ancho de la celda
        const cellHeightDate = 30; // Alto de la celda

        // Dibujar la celda con un rectángulo
        doc.rect(tableX, tableY, cellWidthDate, cellHeightDate).stroke();

        // Medir el tamaño del texto
        const fontSize = 10;
        doc.fontSize(fontSize);
        const text = '12/10/25';
        const textWidth = doc.widthOfString(text);
        const textHeight = doc.currentLineHeight();

        // Calcular coordenadas exactas para centrar el texto en la celda
        const textX = tableX + (cellWidthDate - textWidth) / 2;
        const textYDate = tableY + (cellHeightDate - textHeight) / 2;

        // Agregar el texto centrado en la celda
        doc.text(text, textX, textYDate, {
          width: textWidth,
          align: 'center'
        });


        doc
          .fontSize(10)
          .text('FECHA ENTREGA AL CLIENTE: ', marginX + 12, cellY + 105, {
            width: cellWidth + 80,
            align: 'center',
          });


        const tableXClient = marginX + 18; // Posición X de la tabla
        const tableYClient = cellY + 135; // Posición Y de la tabla
        const cellWidthDateClient = 100; // Ancho de la celda
        const cellHeightDateClient = 30; // Alto de la celda

        // Dibujar la celda con un rectángulo
        doc.rect(tableXClient, tableYClient, cellWidthDateClient, cellHeightDateClient).stroke();

        // Medir el tamaño del texto
        const fontSizeClient = 10;
        doc.fontSize(fontSizeClient);
        const textClient = '12/10/25';
        const textWidthClient = doc.widthOfString(text);
        const textHeightClient = doc.currentLineHeight();

        // Calcular coordenadas exactas para centrar el texto en la celda
        const textXClient = tableXClient + (cellWidthDateClient - textWidthClient) / 2;
        const textYDateClient = tableYClient + (cellHeightDateClient - textHeightClient) / 2;

        // Agregar el texto centrado en la celda
        doc.text(textClient, textXClient, textYDateClient, {
          width: textWidth,
          align: 'center'
        });
        doc
          .fontSize(8)
          .text('Tel: +57 304 130 1189', marginX, textY + 390, {
            width: leftColWidth - 10,
            align: 'left',
          });

        doc.fontSize(8).text('info@medibasculas.com', marginX, textY + 401, {
          width: leftColWidth - 10,
          align: 'left',
        });

        doc.fontSize(8).text('Cra 45D #60-72, Medellin Colombia', marginX, textY + 412, {
          width: leftColWidth - 10,
          align: 'left',
        });
        doc.fontSize(8).text('+57 304 130 1189', marginX, textY + 449, {
          width: leftColWidth - 10,
          align: 'left',
        });
        doc.fontSize(8).text('serviciotecnico@medibasculas.com', marginX, textY + 460, {
          width: leftColWidth - 10,
          align: 'left',
        });
        doc.fontSize(8).text('http://www.medibasculas.com/', marginX, textY + 471, {
          width: leftColWidth - 10,
          align: 'left',
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


      // **Texto de la fecha**
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('FECHA DE INGRESO: ', contentX, contentY + 8, { continued: true })
        .font('Helvetica')
        .text(new Date().toLocaleDateString('es-ES'));

      // **Caja de "Recepción Equipo"**
      const boxX = 450; // Posición en X (ajustar según diseño)
      const boxY = contentY - 5; // Posición en Y
      const boxWidth = 120;
      const boxHeight = 40;

      // Dibujar el cuadro
      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

      // Dibujar línea divisoria interna
      doc.moveTo(boxX, boxY + 20).lineTo(boxX + boxWidth, boxY + 20).stroke();

      // Texto dentro del cuadro
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('RECEPCIÓN EQUIPO', boxX, boxY + 5, { width: boxWidth, align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('RE-0496', boxX, boxY + 25, { width: boxWidth, align: 'center' });


      contentY += 75;

      // Texto a mostrar
      const textTitle = `HOJA DE CONTRATO DE SERVICIO: `;
      const textXTitle = contentX;
      const textYTitle = contentY;

      // **Dibujar el texto centrado**
      doc.font("Helvetica-Bold").fontSize(12).text(textTitle, textXTitle, textYTitle, {
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
        .font('Helvetica-Bold') // Poner en negrita
        .text('NOMBRE: ', contentX, contentY, { continued: true }) // `continued: true` mantiene la misma línea
        .font('Helvetica') // Volver a texto normal
        .text(equipment.clientName || 'No disponible');

      contentY += 15;
      doc
        .font('Helvetica-Bold')
        .text('C.C / NIT: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.clientId || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('DIRECCIÓN: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.clientAddress || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('TEL/CEL: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.clientPhone || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('CONTACTO: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.clientContact || 'No disponible');

      contentY += 30;

      // **4. Datos del Equipo**
      doc.font("Helvetica-Bold").fontSize(14).text('DATOS DEL EQUIPO', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('EQUIPO: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.name || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('MARCA: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.brand || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('MODELO: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.model || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('SERIAL: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.serial || 'N/A');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('ACCESORIOS: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.accessories || 'No disponible');
      contentY += 15;

      doc
        .font('Helvetica-Bold')
        .text('DEFECTOS: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.issue || 'No especificado');
      contentY += 30;

      // **5. Ficha Técnica**
      doc.font("Helvetica-Bold").fontSize(14).text('FICHA TÉCNICA', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('FALLA REPORTADA POR EL CLIENTE: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.issue || 'No especificado');
      contentY += 30;

      // **6. Diagnóstico Técnico**
      doc.font("Helvetica-Bold").fontSize(14).text('DIAGNÓSTICO TÉCNICO', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;

      const imageWidth = 100;
      const imageHeight = 50;
      const margin = 50;

      if (equipment.photos && Array.isArray(equipment.photos)) {
        equipment.photos.forEach((photoBinary, index) => {
          try {
            let base64String;

            // 📌 Detectar si el formato es Binary en lugar de String
            if (typeof photoBinary !== "string") {
              console.warn(`⚠️ La imagen en posición ${index} no es un string, intentando extraer Base64...`);

              // Si el objeto tiene un método toString(), se usa
              if (photoBinary.toString) {
                base64String = photoBinary.toString("base64");
              } else {
                console.error(`🚨 No se pudo convertir la imagen en posición ${index} a Base64.`);
                return;
              }
            } else {
              base64String = photoBinary;
            }

            // 📌 Agregar el prefijo Base64 si falta
            if (!base64String.startsWith("data:image")) {
              console.warn(`⚠️ No tiene prefijo Base64 en posición ${index}, agregando "data:image/png;base64,"...`);
              base64String = `data:image/png;base64,${base64String}`;
            }

            // Extraer solo la parte de la imagen
            const base64Data = base64String.split(",")[1];

            // Convertir a Buffer
            const imageBuffer = Buffer.from(base64Data, "base64");

            // Validar si el buffer es suficientemente grande
            if (imageBuffer.length < 500) {
              console.error(`🚨 El buffer generado para la imagen en posición ${index} es demasiado pequeño (${imageBuffer.length} bytes).`);
              return;
            }

            // Si la posición Y supera la altura del documento, agregar nueva página
            if (contentY + imageHeight + margin > doc.page.height) {
              doc.addPage();
              contentY = margin;
            }

            // Agregar la imagen al PDF
            doc.image(imageBuffer, contentX, contentY, { width: imageWidth, height: imageHeight });

            // Ajustar la posición Y para la siguiente imagen
            contentY += imageHeight + 10;

            console.log(`✅ Imagen en posición ${index} agregada correctamente.`);
          } catch (error) {
            console.error(`❌ Error al procesar imagen en posición ${index}:`, error.message);
          }
        });
      } else {
        console.error("❌ equipment.photos no es un array o está vacío:", equipment.photos);
      }





      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DIAGNÓSTICO: ', contentX, contentY, { continued: true })
        .font('Helvetica')
        .text(equipment.diagnosis || 'Pendiente de revisión.');
      contentY += 30;

      // **8. Términos y Condiciones**
      doc.font("Helvetica-Bold").fontSize(14).text('TÉRMINOS Y CONDICIONES DE SERVICIO', contentX, contentY, {
        width: rightColWidth,
        underline: true,
      });
      contentY += 20;


      doc.font("Helvetica")
        .fontSize(10)
        .text(
          'PARA LOS EFECTOS DE CONVENIO ENTIENDASE LA EMPRESA IMPORTACIONES MEDIBÁSCULAS ZOMAC S.A.S como prestador del servicio; y como cliente a quien firma la presente. EL CLIENTE acepta y convenio expresamente lo siguiente: 1. No nos hacemos responsables por fallas ocultas no declaradas por el cliente, presentes en el equipo que solo son identificadas en una revisión técnica exhaustiva. 2. La empresa no se hace responsable por equipos dejados en el taller, pasado los 30 días, perdiendo el cliente todo el derecho sobre el/los equipos en cuestión, y el equipo pasará a ser reciclado y desechado 3. La garantía cubre solo la pieza reparada y/o reemplazada del equipo y será válida por 01 un mes desde la fecha de entrega siempre que este no tenga el sello de garantía alterado y con la presente hoja de servicio, 4. al cumplir 10 días hábiles de notificarle que su equipo está listo para ser retirado, se comenzará a cobrar 3% por día del precio del servicio prestado, por concepto de almacenaje hasta lo expresado en la cláusula 2. 5. La empresa no se hace responsable si durante el tiempo establecido en la cláusula 4 el equipo sufre daños o perdidas en nuestras instalaciones por algún desastre de índole natural, inundaciones, terremotos, sismos, lluvia, incendios, hurtos, robos, causando estos el daño parcial o total en el quipo o la desaparición. 6 las fallas reportadas por el cliente al momento de solicitar el servicio no son únicas ni absolutas y serán verificadas al momento de la de la revisión y las fallas encontradas serán notificadas al cliente para validar la reparación. 7. En caso de que una prueba de funcionamiento demuestre que el desperfecto no radica en el equipo, la empresa cobrara el valor vigente de la revisión. 8 la empresa dará un presupuesto con el valor del servicio, sin que ello constituya compromiso alguno, y se le notificará al cliente, quien dentro de los (03) tres días hábiles siguiente debe autorizar o no el servicio y quedará escrito en esta hoja con la respectiva fecha. 9. La empresa cobrara el valor de revisión si el cliente no aprueba el servicio de reparación. 10. La empresa no recibirá el equipo por garantía cuando el lapso de esta haya culminado y sin presentar esta hoja donde está expuesto el repuesto y/o falla reparada. 11 la garantía no cubre cuando el equipo es reparado, revisado o manipulado por un tercero y/o haya sido adaptado o conectado algún equipo o accesorio ajeno a su modelo de fabricación.',
          contentX,
          contentY,
          { width: rightColWidth },
        );

      contentY -= 230;

      doc.font("Helvetica-Bold")
        .fontSize(10)
        .text(
          'He leído y acepto los términos y condiciones:', contentX,
          contentY,
          { width: rightColWidth },
        );

      contentY += 30;

      // **9. Firma del Cliente**
      doc.font("Helvetica")
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
