import { defineType, defineField } from 'sanity'

export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  fields: [
    defineField({
      name: 'orderNumber',
      title: 'Order Number',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'squareOrderId',
      title: 'Square Order ID',
      type: 'string',
      description: 'Square Payment Link order ID'
    }),
    defineField({
      name: 'squarePaymentId',
      title: 'Square Payment ID',
      type: 'string',
      description: 'Square payment transaction ID'
    }),
    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'object',
      fields: [
        defineField({
          name: 'email',
          title: 'Email',
          type: 'string',
          validation: Rule => Rule.required().email()
        }),
        defineField({
          name: 'firstName',
          title: 'First Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'lastName',
          title: 'Last Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'phone',
          title: 'Phone',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'items',
      title: 'Order Items',
      type: 'array',
      of: [
        defineType({
          type: 'object',
          fields: [
            defineField({
              name: 'product',
              title: 'Product',
              type: 'reference',
              to: [{ type: 'product' }],
              validation: Rule => Rule.required()
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              validation: Rule => Rule.required().min(1)
            }),
            defineField({
              name: 'price',
              title: 'Price',
              type: 'number',
              validation: Rule => Rule.required().min(0)
            }),
            defineField({
              name: 'variant',
              title: 'Variant',
              type: 'string'
            })
          ]
        })
      ]
    }),
    defineField({
      name: 'subtotal',
      title: 'Subtotal',
      type: 'number',
      validation: Rule => Rule.required().min(0)
    }),
    defineField({
      name: 'shippingCost',
      title: 'Shipping Cost',
      type: 'number',
      validation: Rule => Rule.required().min(0)
    }),
    defineField({
      name: 'tax',
      title: 'Tax',
      type: 'number',
      validation: Rule => Rule.required().min(0)
    }),
    defineField({
      name: 'total',
      title: 'Total',
      type: 'number',
      validation: Rule => Rule.required().min(0)
    }),
    defineField({
      name: 'status',
      title: 'Order Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Paid', value: 'paid' },
          { title: 'Processing', value: 'processing' },
          { title: 'Shipped', value: 'shipped' },
          { title: 'Delivered', value: 'delivered' },
          { title: 'Cancelled', value: 'cancelled' },
          { title: 'Refunded', value: 'refunded' }
        ]
      },
      initialValue: 'pending',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'paymentStatus',
      title: 'Payment Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Paid', value: 'paid' },
          { title: 'Failed', value: 'failed' },
          { title: 'Refunded', value: 'refunded' },
          { title: 'Partially Refunded', value: 'partially_refunded' }
        ]
      },
      initialValue: 'pending',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'shippingAddress',
      title: 'Shipping Address',
      type: 'object',
      fields: [
        defineField({
          name: 'firstName',
          title: 'First Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'lastName',
          title: 'Last Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'company',
          title: 'Company',
          type: 'string'
        }),
        defineField({
          name: 'address1',
          title: 'Address Line 1',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'address2',
          title: 'Address Line 2',
          type: 'string'
        }),
        defineField({
          name: 'city',
          title: 'City',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'state',
          title: 'State/Prefecture',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'postalCode',
          title: 'Postal Code',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'country',
          title: 'Country',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'phone',
          title: 'Phone',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'billingAddress',
      title: 'Billing Address',
      type: 'object',
      fields: [
        defineField({
          name: 'firstName',
          title: 'First Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'lastName',
          title: 'Last Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'company',
          title: 'Company',
          type: 'string'
        }),
        defineField({
          name: 'address1',
          title: 'Address Line 1',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'address2',
          title: 'Address Line 2',
          type: 'string'
        }),
        defineField({
          name: 'city',
          title: 'City',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'state',
          title: 'State/Prefecture',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'postalCode',
          title: 'Postal Code',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'country',
          title: 'Country',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'phone',
          title: 'Phone',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'shippingMethod',
      title: 'Shipping Method',
      type: 'object',
      fields: [
        defineField({
          name: 'id',
          title: 'ID',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'name',
          title: 'Name',
          type: 'string',
          validation: Rule => Rule.required()
        }),
        defineField({
          name: 'price',
          title: 'Price',
          type: 'number',
          validation: Rule => Rule.required().min(0)
        }),
        defineField({
          name: 'estimatedDays',
          title: 'Estimated Days',
          type: 'number',
          validation: Rule => Rule.required().min(1)
        })
      ]
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text'
    }),
    defineField({
      name: 'trackingNumber',
      title: 'Tracking Number',
      type: 'string'
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'object',
      description: 'Additional data for future features (e.g., reservation system)',
      fields: [
        defineField({
          name: 'reservationId',
          title: 'Reservation ID',
          type: 'string',
          description: 'For future reservation system integration'
        }),
        defineField({
          name: 'customData',
          title: 'Custom Data',
          type: 'object',
          fields: [
            defineField({
              name: 'newsletter',
              title: 'Newsletter Subscription',
              type: 'boolean'
            }),
            defineField({
              name: 'terms',
              title: 'Terms Accepted',
              type: 'boolean'
            }),
            defineField({
              name: 'additionalInfo',
              title: 'Additional Information',
              type: 'text'
            })
          ]
        })
      ]
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'estimatedDelivery',
      title: 'Estimated Delivery',
      type: 'datetime'
    })
  ],
  preview: {
    select: {
      title: 'orderNumber',
      subtitle: 'customer.email',
      media: 'status'
    },
    prepare(selection) {
      const { title, subtitle } = selection
      return {
        title: `Order ${title}`,
        subtitle: subtitle || 'No customer email'
      }
    }
  }
})