/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inventory, InventoryDocument } from './inventory.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
  ) {}

  async create(data: Partial<Inventory>): Promise<Inventory> {
    const newInventory = new this.inventoryModel(data);
    return newInventory.save();
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
