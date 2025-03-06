/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './equipment.schema';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name)
    private equipmentModel: Model<EquipmentDocument>,
  ) {}

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
      // **1. Encabezado**
      doc
        .fontSize(16)
        .text('HOJA DE CONTRATO DE SERVICIO', { align: 'center' })
        .moveDown(1);
      doc
        .fontSize(12)
        .text(`FECHA DE INGRESO: ${new Date().toLocaleDateString('es-ES')}`);

      doc.moveDown(2);

      // **2. Datos del Cliente**
      doc
        .fontSize(14)
        .text('DATOS DEL CLIENTE', { underline: true })
        .moveDown(1);
      doc
        .fontSize(12)
        .text(`NOMBRE: ${equipment.clientName || 'No disponible'}`);
      doc.text(`C.C / NIT: ${equipment.clientId || 'No disponible'}`);
      doc.text(`DIRECCIÓN: ${equipment.clientAddress || 'No disponible'}`);
      doc.text(`TEL/CEL: ${equipment.clientPhone || 'No disponible'}`);
      doc.text(`CONTACTO: ${equipment.clientContact || 'No disponible'}`);

      doc.moveDown(2);

      // **3. Datos del Equipo**
      doc
        .fontSize(14)
        .text('DATOS DEL EQUIPO', { underline: true })
        .moveDown(1);
      doc.fontSize(12).text(`EQUIPO: ${equipment.name}`);
      doc.text(`MARCA: ${equipment.brand}`);
      doc.text(`MODELO: ${equipment.model}`);
      doc.text(`SERIAL: ${equipment.serial || 'N/A'}`);
      doc.text(`ACCESORIOS: ${equipment.accessories || 'No disponible'}`);
      doc.text(`DEFECTOS: ${equipment.issue || 'No especificado'}`);

      doc.moveDown(2);

      // **4. Ficha Técnica**
      doc.fontSize(14).text('FICHA TÉCNICA', { underline: true }).moveDown(1);
      doc
        .fontSize(12)
        .text(
          `FALLA REPORTADA POR EL CLIENTE: ${equipment.issue || 'No especificado'}`,
        );

      doc.moveDown(2);

      // **5. Diagnóstico Técnico**
      doc
        .fontSize(14)
        .text('DIAGNÓSTICO TÉCNICO', { underline: true })
        .moveDown(1);
      doc.fontSize(12).text(equipment.diagnosis || 'Pendiente de revisión.');

      doc.moveDown(2);

      // **6. Recepción del Equipo**
      doc
        .fontSize(14)
        .text('RECEPCIÓN EQUIPO', { underline: true })
        .moveDown(1);
      doc.fontSize(12).text(`Código de Recepción: ${equipment._id}`);
      doc.text('APROBACIÓN DEL CLIENTE: SI [ ]   NO [ ]');

      doc.moveDown(2);

      // **7. Términos y Condiciones**
      doc
        .fontSize(14)
        .text('TÉRMINOS Y CONDICIONES DE SERVICIO', { underline: true })
        .moveDown(1);
      doc
        .fontSize(10)
        .text(
          '1. No nos hacemos responsables por fallas ocultas no declaradas por el cliente... \n' +
            '2. La empresa no se hace responsable por equipos dejados más de 30 días... \n' +
            '3. La garantía cubre solo la pieza reparada... \n' +
            '4. Se comenzará a cobrar un 3% por día después de 10 días sin retiro del equipo...',
        );

      doc.moveDown(3);

      // **8. Firma del Cliente**
      doc.fontSize(12).text('Firma del cliente: ____________________________');

      // **Finalizar PDF**
      doc.end();
    });
  }
}
