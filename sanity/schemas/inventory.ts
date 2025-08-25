import { defineType, defineField } from 'sanity'

export const inventory = defineType({
  name: 'inventory',
  title: 'Inventory',
  type: 'document',
  fields: [
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'variant',
      title: 'Variant',
      type: 'string',
      description: 'Product variant if applicable'
    }),
    defineField({
      name: 'quantity',
      title: 'Current Quantity',
      type: 'number',
      validation: Rule => Rule.required().min(0)
    }),
    defineField({
      name: 'reserved',
      title: 'Reserved Quantity',
      type: 'number',
      initialValue: 0,
      validation: Rule => Rule.required().min(0),
      description: 'Quantity reserved for pending orders'
    }),
    defineField({
      name: 'available',
      title: 'Available Quantity',
      type: 'number',
      readOnly: true,
      description: 'Calculated field: quantity - reserved'
    }),
    defineField({
      name: 'reorderLevel',
      title: 'Reorder Level',
      type: 'number',
      validation: Rule => Rule.required().min(0),
      description: 'Minimum stock level before reordering'
    }),
    defineField({
      name: 'maxStock',
      title: 'Maximum Stock',
      type: 'number',
      validation: Rule => Rule.min(0),
      description: 'Maximum stock capacity'
    }),
    defineField({
      name: 'supplier',
      title: 'Supplier',
      type: 'string',
      description: 'Supplier information'
    }),
    defineField({
      name: 'supplierSku',
      title: 'Supplier SKU',
      type: 'string',
      description: 'Supplier product code'
    }),
    defineField({
      name: 'costPrice',
      title: 'Cost Price',
      type: 'number',
      validation: Rule => Rule.min(0),
      description: 'Purchase cost per unit'
    }),
    defineField({
      name: 'location',
      title: 'Storage Location',
      type: 'string',
      description: 'Physical storage location'
    }),
    defineField({
      name: 'condition',
      title: 'Condition',
      type: 'string',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'Good', value: 'good' },
          { title: 'Fair', value: 'fair' },
          { title: 'Damaged', value: 'damaged' }
        ]
      },
      initialValue: 'new'
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      description: 'Additional notes about this inventory item'
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'lastStockCheck',
      title: 'Last Stock Check',
      type: 'datetime',
      description: 'Last physical stock verification date'
    }),
    defineField({
      name: 'lowStockAlert',
      title: 'Low Stock Alert',
      type: 'boolean',
      initialValue: false,
      description: 'Auto-generated alert when stock is below reorder level'
    }),
    defineField({
      name: 'trackingEnabled',
      title: 'Tracking Enabled',
      type: 'boolean',
      initialValue: true,
      description: 'Enable inventory tracking for this item'
    })
  ],
  preview: {
    select: {
      title: 'product.name',
      subtitle: 'variant',
      quantity: 'quantity',
      available: 'available'
    },
    prepare(selection) {
      const { title, subtitle, quantity, available } = selection
      return {
        title: title || 'Unknown Product',
        subtitle: subtitle 
          ? `${subtitle} - Stock: ${quantity} (Available: ${available})`
          : `Stock: ${quantity} (Available: ${available})`
      }
    }
  }
})