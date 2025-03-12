import React, { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

function StakingControl() {
    const [amount, setAmount] = useState('');
    const [isStaking, setIsStaking] = useState(true);

    const [loading,setLoading] = useState(false);

    const {signAndSubmitTransaction} = useWallet();
    const handleSubmit = async(e) => {
      e.preventDefault();
      const val = String(amount)
      setLoading(true);

      try{
        if(isStaking){
          try{
          const moduleAddress = "0x4b299af105e6d02231972cb815ecfa7837ee9c19e2db0a047f61d14b03781d81";
          const moduleName = "price_oracle";
          const payload = {
              data: {
                  function: `${moduleAddress}::${moduleName}::stake_more`,
                  functionArguments: [val]
              }
          };
          const response = await signAndSubmitTransaction(payload);
          console.log(response);
          return response;
        }
        catch(e){
          console.log(e);
        }
        }
        else{
          try{
            const moduleAddress = "0x4b299af105e6d02231972cb815ecfa7837ee9c19e2db0a047f61d14b03781d81";
            const moduleName = "price_oracle";
            const payload = {
                data: {
                    function: `${moduleAddress}::${moduleName}::unstake`,
                    functionArguments: [val]
                }
            };
            const response = await signAndSubmitTransaction(payload);
            console.log(response);
            return response;
          }
          catch(e){
            console.log(e);
          }
        }
      }
      catch(e){

      }

      finally{
        setAmount('');
        setLoading(false);
      }
    };
      return (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsStaking(true)}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                isStaking 
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              Acquire Agent
            </button>
            <button
              onClick={() => setIsStaking(false)}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                !isStaking 
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              Release Agent
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                Stake Amount (OPTAS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.001"
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/20 transition-all"
                />
                <span className="absolute right-3 top-3 text-gray-400">ETH</span>
              </div>
            </div>
            {
              loading ? (<div className=" text-center w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-colors">processing</div>) : (<button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                {isStaking ? 'Acquire AI Agent' : 'Release AI Agent'}
              </button>) 
            }
          </form>
        </div>
      );
    }
  
export default StakingControl;