'use client'

import * as React from 'react'
import QRCode from 'react-qr-code'

export interface PrintableLabelProps {
  /** The barcode/QR code value */
  barcode: string
  /** Item name */
  itemName: string
  /** Item SKU */
  sku: string
  /** Unit of measurement */
  unit?: string
}

export const PrintableLabel = React.forwardRef<HTMLDivElement, PrintableLabelProps>(
  ({ barcode, itemName, sku, unit }, ref) => {
    return (
      <div
        ref={ref}
        className="print-label bg-white p-6 w-[300px] text-center"
        style={{
          pageBreakInside: 'avoid',
        }}
      >
        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <QRCode
            value={barcode}
            size={150}
            level="M"
          />
        </div>

        {/* Barcode text */}
        <p className="font-mono text-sm text-neutral-600 mb-3">
          {barcode}
        </p>

        {/* Item name */}
        <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2">
          {itemName}
        </h3>

        {/* SKU and unit */}
        <p className="text-sm text-neutral-500">
          {sku}
          {unit && ` | ${unit}`}
        </p>
      </div>
    )
  }
)

PrintableLabel.displayName = 'PrintableLabel'

export default PrintableLabel
