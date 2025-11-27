import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    const client = this.request['client'];
    
    const order = this.orderRepository.create({
      total: createOrderDto.total,
      clientId: client.id,
      userId: userId,
      status: 'completed', // Como é apenas para visualização
    });

    const savedOrder = await this.orderRepository.save(order);

    // Criar os itens do pedido
    const orderItems = createOrderDto.items.map((item: CreateOrderItemDto) => {
      return this.orderItemRepository.create({
        ...item,
        orderId: savedOrder.id,
      });
    });

    savedOrder.items = await this.orderItemRepository.save(orderItems);

    return savedOrder;
  }

  async findAll(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    return order;
  }
}