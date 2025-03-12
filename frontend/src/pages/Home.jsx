import RegisterButton from "../components/RegisterButton";
import PriceFeedGraph from "../components/Graph";
import AgentInfo from "../components/AgentInfo";
import React, { useEffect, useState } from 'react';
import { Bot, Award, CheckCircle, BarChart3, Wallet } from 'lucide-react';
import StakingControl from "../components/StatControl";
import StatCard from "../components/StatCard";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig , Network} from "@aptos-labs/ts-sdk";
import { data } from "react-router-dom";

export default function Dashboard() {
    const [loading, setLoading] = useState(false);
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    const { account , isLoading } = useWallet();

    const [agentDetails,setAgentDetails] = useState([]);
    const [price,setPrice] = useState(0);

    const moduleAddress = "0x4b299af105e6d02231972cb815ecfa7837ee9c19e2db0a047f61d14b03781d81";
    const moduleName = "price_oracle";
  
    const fetch_details = async () => {
      if (!account || !account.address) return;
  
      try {

        console.log("address is : " , account.address)
        const payload = {
          function: `${moduleAddress}::${moduleName}::get_agent_details`,
          functionArguments: [String(account.address)],
        };
        console.log("making a call to function")
        const response = await aptos.view({payload});
        console.log("after making call")
        console.log("response is : ",response)
        setAgentDetails(response);
        console.log(response[0]);
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    };
  
    const fetch_price = async () => {
      try {

        const payload2 = {
          function: `${moduleAddress}::${moduleName}::get_latest_price`, // Fixed function reference
          functionArguments : []
        };

        console.log(payload2)
        console.log("calling the function")
        const response2 = await aptos.view({payload : payload2});
        setPrice(response2)
        console.log(response2); // Correct way to access response
        console.log("after calling the function")
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };
  
    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        await fetch_details();
        await fetch_price();
        setLoading(false);
      };
  
      fetchData();
    }, [isLoading,account])


    if(loading) return <div>Loading...</div>
    if(!loading){

      const isRegistered = agentDetails[0];
      const LastPrice = agentDetails[2];
      const totalSubmissions = agentDetails[4];
      const stakedAmount = agentDetails[1]/10**8;
      const SuccessRate = (parseFloat(agentDetails[4]) - parseFloat(agentDetails[3]))/parseFloat(agentDetails[4]) * 100;
      return (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="text-emerald-400" />
              AI Price Feed Dashboard
            </h1>
            {isRegistered ? (
              <div className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700/50">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium">Agent Active</span>
              </div>
            ) : (
              <RegisterButton />
            )}
          </div>
    
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Award}
              title="Last Price Update"
              value={`$${LastPrice}`}
            />
            <StatCard
              icon={Wallet}
              title="Total Updates"
              value={totalSubmissions}
            />
            <StatCard
              icon={CheckCircle}
              title="Amount Staked"
              value={stakedAmount}
            />
            <StatCard
              icon={BarChart3}
              title="Accuracy Rate"
              value={SuccessRate}
            />
          </div>
    
          {/* Price Feed Graph */}
          <div className="mb-8">
            <PriceFeedGraph />
          </div>
    
          {/* Interactive Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StakingControl />
            <AgentInfo />
          </div>
        </div>
      );
    }
        }
  // }