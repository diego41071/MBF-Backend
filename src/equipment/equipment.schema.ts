/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipmentDocument = Equipment & Document;

@Schema()
export class Equipment {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop()
  serial: string;

  @Prop({ required: true })
  issue: string;

  @Prop()
  photos: Buffer[];

  @Prop()
  invoice: Buffer;

  // Ficha técnica ahora es opcional
  @Prop({ unique: true, sparse: true })
  technicalDataSheet?: string;

  @Prop()
  diagnosis: string;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
