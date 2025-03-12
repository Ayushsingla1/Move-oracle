import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import {useWallet} from "@aptos-labs/wallet-adapter-react"
function RegisterButton() {

    const [loading, setLoading] = useState(false);
    const { signAndSubmitTransaction } = useWallet();

    const handleRegister = async (e) => {
        setLoading(true);
        const moduleAddress = "0x4b299af105e6d02231972cb815ecfa7837ee9c19e2db0a047f61d14b03781d81";
        const moduleName = "price_oracle";
        const payload = {
            data: {
                function: `${moduleAddress}::${moduleName}::register_as_agent`,
                functionArguments: [100000000]
            }
        };

        const response = await signAndSubmitTransaction(payload);
        console.log(response);
        setLoading(false);
        return response;
    }
        return (
            <div>
                {
                    loading ? (<div className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">
                        <Bot className="w-5 h-5" />
                        Loading...
                    </div>) : (<button
                        onClick={handleRegister}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <Bot className="w-5 h-5" />
                        Register New Agent
                    </button>)
                }
            </div>
        );
    }


export default RegisterButton;