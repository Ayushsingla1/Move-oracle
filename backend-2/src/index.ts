import express from "express";
import 'dotenv/config';
import axios from "axios";
const app = express();
import { 
  Aptos, 
  AptosConfig, 
  InputEntryFunctionData, 
  InputViewFunctionData, 
  Network, 
  Account, 
  Ed25519PrivateKey
} from "@aptos-labs/ts-sdk";

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    console.error("Private key not found in environment variables");
    process.exit(1);
}

const pK = new Ed25519PrivateKey(privateKey);
const account = Account.fromPrivateKey({ privateKey : pK });

const moduleAddress = "0x4b299af105e6d02231972cb815ecfa7837ee9c19e2db0a047f61d14b03781d81";
const moduleName = "price_oracle";
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface ResponseType {
    success: boolean;
    msg: string | number | object;
}

async function isRegistered() {
    try {
        const payload: InputViewFunctionData = {
            function: `${moduleAddress}::${moduleName}::get_agent_details`,
            functionArguments: [String(account.publicKey)],
        };
        const response = await aptos.view({payload});
        if(!response[0]) {

            const transaction = await aptos.transaction.build.simple({
                sender: account.accountAddress,
                data: {
                function: `${moduleAddress}::${moduleName}::register_as_agent`,
                functionArguments: [String(10**8)],
                },
            });

            const senderAuthenticator = aptos.transaction.sign({
                signer: account,
                transaction,
              });

            console.log(senderAuthenticator)
            
            if(!senderAuthenticator) {
                console.log("Error while registering as an agent, try again later");
            } else {
                console.log("Welcome, Successfully registered as a new agent");
                console.log("Transaction hash:", senderAuthenticator);
            }
        } else {
            console.log("Already Registered as Agent");
        }
        return;
    } catch(e) {
        console.log("Error in isRegistered function:", e);
    }
}

isRegistered();

async function getEthPrice(ids = "ethereum"): Promise<ResponseType> {
    try {
        // ETHUSDT is the correct symbol for Ethereum/USDT pair
        const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT`);
        if (!data?.price) {
            return { success: false, msg: "Invalid price data received" };
        }
        return { success: true, msg: String(data.price) };
    } catch (error) {
        console.error("Failed to get ETH price:", error);
        return { success: false, msg: "Failed to fetch ETH price" };
    }
}

async function updatePrice(): Promise<ResponseType> {
    try {
        const priceResponse = await getEthPrice();
        if (!priceResponse.success) {
            return priceResponse;
        }

        const transaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
            // All transactions on Aptos are implemented via smart contracts.
            function: `${moduleAddress}::${moduleName}::submit_price`,
            functionArguments: [(parseFloat(priceResponse.msg as string) * 10**8)],
            },
        });

        const senderAuthenticator = aptos.transaction.sign({
            signer: account,
            transaction,
          });

        console.log(senderAuthenticator)
        
        if (!senderAuthenticator) {
            return { success: false, msg: "Transaction failed to initiate" };
        }

        console.log(`Price updated successfully. Transaction hash: ${senderAuthenticator}`);
        return { success: true, msg: senderAuthenticator };
    } catch (error) {
        console.error("Price update failed:", error);
        return { success: false, msg: "Failed to update price" };
    }
}

// Run updatePrice once at startup
updatePrice().then(result => {
    if (result.success) {
        console.log("Initial price update successful");
    } else {
        console.log("Initial price update failed:", result.msg);
    }
});

// Set interval for regular updates (16 minutes)
setInterval(updatePrice, 16 * 60 * 1000);

const PORT = 3002;
app.listen(PORT, () => {
    const banner = `
     █████╗ ██╗     ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗
    ██╔══██╗██║    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝
    ███████║██║    ██║   ██║██████╔╝███████║██║     ██║     █████╗  
    ██╔══██║██║    ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝  
    ██║  ██║██║    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗
    ╚═╝  ╚═╝╚═╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝                                                      
  `;

  console.log(banner);
  console.log('    Welcome To Agentic-Oracle     ');
  console.log(`    Server running on port ${PORT}     `);
});