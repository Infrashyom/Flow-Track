
import React, { useMemo } from 'react';
import { Order, OrderStatus, Priority } from '../../types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { CheckCircleIcon } from '../icons/Icons';

interface OrderCardProps {
  order: Order;
  onViewDetails: () => void;
  actions?: React.ReactNode;
  hideCustomerInfo?: boolean;
  hideDates?: boolean;
  hideStatus?: boolean;
  digitizerName?: string;
}

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.AT_TEAM:
      return 'bg-blue-100 text-blue-800';
    case OrderStatus.AT_DIGITIZER:
      return 'bg-orange-100 text-orange-800';
    case OrderStatus.TEAM_REVIEW:
      return 'bg-yellow-100 text-yellow-800';
    case OrderStatus.AT_VENDOR:
      return 'bg-purple-100 text-purple-800';
    case OrderStatus.PARTIALLY_SHIPPED:
        return 'bg-indigo-100 text-indigo-800';
    case OrderStatus.OUT_FOR_DELIVERY:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
        case Priority.HIGH:
            return 'bg-red-100 text-red-800';
        case Priority.MEDIUM:
            return 'bg-yellow-100 text-yellow-800';
        case Priority.LOW:
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};

const getFinancialStatusStyle = (status?: string) => {
    if (!status) return 'hidden';
    switch (status.toLowerCase()) {
        case 'paid':
            return 'bg-green-100 text-green-800';
        case 'partially paid':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, actions, hideCustomerInfo, hideDates, hideStatus, digitizerName }) => {
  const formattedDate = new Date(order.updatedAt).toLocaleString();
  
  const itemsData = useMemo(() => {
      if (order.lineItems && order.lineItems.length > 0) {
          return order.lineItems.map(li => {
              const shipped = li.shippedQuantity || 0;
              const isFullyShipped = shipped >= li.quantity;
              const isPartiallyShipped = shipped > 0 && shipped < li.quantity;
              return {
                  text: `${li.quantity} x ${li.name}`,
                  isFullyShipped,
                  isPartiallyShipped,
                  shippedAmount: shipped
              };
          });
      }
      // Fallback for legacy
      return (order.productName ? order.productName.split(', ') : []).map(p => ({
          text: p,
          isFullyShipped: false,
          isPartiallyShipped: false,
          shippedAmount: 0
      }));
  }, [order.lineItems, order.productName]);

  const displayProducts = itemsData.slice(0, 3);
  const remainingCount = itemsData.length - 3;

  return (
    <Card className="flex flex-col h-full transition-shadow duration-300 hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="truncate">{order.shopifyOrderNumber || order.id}</CardTitle>
                    {order.financialStatus && (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getFinancialStatusStyle(order.financialStatus)} whitespace-nowrap`}>
                            {order.financialStatus}
                        </span>
                    )}
                </div>
                <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-tight">Products:</p>
                    <div className="bg-slate-50 rounded-md border border-slate-100 p-2">
                        <ul className="space-y-1 text-sm text-slate-600">
                            {displayProducts.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 truncate text-[13px] leading-snug" title={item.text}>
                                    {item.isFullyShipped ? (
                                        <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    ) : item.isPartiallyShipped ? (
                                        <CheckCircleIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 mx-1 flex-shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {item.text} 
                                        {item.isPartiallyShipped && <span className="text-[10px] text-slate-400 ml-1 font-medium">(Shipped: {item.shippedAmount})</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {remainingCount > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1 ml-4">+ {remainingCount} more item{remainingCount > 1 ? 's' : ''}</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getPriorityStyle(order.priority)} whitespace-nowrap`}>
                  {order.priority}
              </span>
              {!hideStatus && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)} whitespace-nowrap`}>
                    {order.status}
                </span>
              )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-0">
        <div className="text-sm text-slate-600 space-y-1">
          {!hideCustomerInfo && <p className="truncate"><strong>Customer:</strong> {order.customerName}</p>}
          {!hideDates && <p><strong>Last Update:</strong> {formattedDate}</p>}
          {digitizerName && order.status === OrderStatus.TEAM_REVIEW && (
            <p className="pt-2 mt-2 border-t border-slate-200">
              <strong className="text-slate-800">From Digitizer:</strong> {digitizerName}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-auto">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          View Details
        </Button>
        <div className="flex space-x-2">
            {actions}
        </div>
      </CardFooter>
    </Card>
  );
};

export default OrderCard;
