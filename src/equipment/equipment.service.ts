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

      // Título
      doc.fontSize(16).text('Ficha Técnica del Equipo', { align: 'center' });
      doc.moveDown(2);

      // Formatear fechas correctamente
      const createdAt = equipment.createdAt
        ? new Date(equipment.createdAt).toISOString().split('T')[0]
        : 'No disponible';
      const updatedAt = equipment.updatedAt
        ? new Date(equipment.updatedAt).toISOString().split('T')[0]
        : 'No disponible';

      // Datos del equipo
      const data = [
        { label: 'ID', value: equipment._id || 'No disponible' },
        { label: 'Nombre', value: equipment.name || 'No disponible' },
        { label: 'Marca', value: equipment.brand || 'No disponible' },
        { label: 'Modelo', value: equipment.model || 'No disponible' },
        {
          label: 'Número de Serie',
          value: equipment.serial || 'No disponible',
        },
        { label: 'Falla', value: equipment.issue || 'No disponible' },
        { label: 'Foto', value: equipment.photo || 'No disponible' },
        { label: 'Fecha de Creación', value: createdAt },
        { label: 'Última Actualización', value: updatedAt },
        {
          label: 'Factura',
          value: equipment.invoice ? 'Disponible' : 'No disponible',
        },
      ];

      doc.fontSize(12);
      data.forEach(({ label, value }) => {
        doc.text(`${label}: ${value}`);
        doc.moveDown(0.5);
      });

      // Finalizar el documento
      doc.end();
    });
  }
}
