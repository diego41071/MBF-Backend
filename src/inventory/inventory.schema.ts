/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema()
export class Inventory {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  serialNumber: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  purchaseDate: Date;

  @Prop()
  voltage: string;

  @Prop()
  power: string;

  @Prop()
  weight: string;

  @Prop()
  capacity: string;

  @Prop()
  material: string;

  @Prop({ required: true, enum: ['Fijo', 'Movil'] }) // Campo para "De uso"
  usage: string;

  @Prop({
    required: true,
    enum: ['Mecanico', 'Electrico', 'Hidraulico', 'Electronico', 'Neumatico'],
  }) // Campo para "Tecnología predominante"
  technology: string;

  @Prop({ required: true, enum: ['Baja', 'Media', 'Alta'] }) // Campo para "Prioridad de mantenimiento"
  maintenancePriority: string;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
