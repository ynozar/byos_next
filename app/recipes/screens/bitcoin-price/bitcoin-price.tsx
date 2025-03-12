import { PreSatori } from "@/utils/pre-satori";

interface BitcoinPriceProps {
  price?: string;
  change24h?: string;
  marketCap?: string;
  volume24h?: string;
  lastUpdated?: string;
  high24h?: string;
  low24h?: string;
}

export default function BitcoinPrice({
  price = "Loading...",
  change24h = "0",
  marketCap = "Loading...",
  volume24h = "Loading...",
  lastUpdated = "Loading...",
  high24h = "Loading...",
  low24h = "Loading...",
}: BitcoinPriceProps) {
  // Calculate if price change is positive or negative
  const isPositive = !change24h.startsWith("-");
  const changeValue = isPositive ? change24h : change24h.substring(1);
  
  return (
    <PreSatori>
      {(transform) => (
        <>
          {transform(
            <div className="flex flex-col w-[800px] h-[480px] bg-white">
              <div className="px-4 py-2 border-b border-black">
                <h1 className="text-2xl font-bold text-black">Bitcoin Price</h1>
                <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
              </div>
              
              <div className="flex flex-1 p-4">
                {/* Price and change section */}
                <div className="flex flex-col items-start justify-center w-1/2 p-4 border-r border-gray-300">
                  <div className="text-4xl font-bold text-black mb-2">${price}</div>
                  <div className={`text-xl font-semibold ${isPositive ? 'text-black' : 'text-black'}`}>
                    {isPositive ? "+" : "-"}{changeValue}%
                    <span className="ml-2 text-sm">(24h)</span>
                  </div>
                  
                  <div className="mt-6 w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">24h High</span>
                      <span className="text-sm font-medium text-black">${high24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">24h Low</span>
                      <span className="text-sm font-medium text-black">${low24h}</span>
                    </div>
                  </div>
                </div>
                
                {/* Market data section */}
                <div className="w-1/2 p-4">
                  <h2 className="text-xl font-semibold text-black mb-4">Market Data</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm text-gray-700">Market Cap</h3>
                      <p className="text-lg font-medium text-black">${marketCap}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm text-gray-700">24h Volume</h3>
                      <p className="text-lg font-medium text-black">${volume24h}</p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Data provided by CoinGecko API. This information is for educational 
                        purposes only and not financial advice.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
          )}
        </>
      )}
    </PreSatori>
  );
} 