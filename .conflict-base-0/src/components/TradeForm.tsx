import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { cn } from '../lib/utils';

export function TradeForm() {
  const [side, setSide] = useState('buy');

  return (
    <div className={cn(
      "h-full flex flex-col p-2"
    )}>
      <Tabs defaultValue="limit" className="w-full h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="limit">Limit</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="stop">Stop</TabsTrigger>
        </TabsList>
        <TabsContent value="limit" className="h-[calc(100%-48px)] mt-4 overflow-auto scrollbar-thin">
          <div className="space-y-4 pr-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={side === 'buy' ? 'default' : 'outline'}
                onClick={() => setSide('buy')}
                className="w-full"
              >
                Buy
              </Button>
              <Button
                variant={side === 'sell' ? 'destructive' : 'outline'}
                onClick={() => setSide('sell')}
                className="w-full"
              >
                Sell
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm">Price</div>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <div className="text-sm">Amount</div>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <div className="text-sm">Total</div>
              <Input type="number" placeholder="0.00" readOnly />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Size</span>
                <span>0%</span>
              </div>
              <Slider defaultValue={[0]} max={100} step={1} />
            </div>
            <Button className="w-full" size="lg">
              {side === 'buy' ? 'Buy BTC' : 'Sell BTC'}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="market" className="h-[calc(100%-48px)] mt-4">
          Market order form
        </TabsContent>
        <TabsContent value="stop" className="h-[calc(100%-48px)] mt-4">
          Stop order form
        </TabsContent>
      </Tabs>
    </div>
  );
}