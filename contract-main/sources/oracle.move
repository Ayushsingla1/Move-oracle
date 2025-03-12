module price_oracle_network::price_oracle {
    use std::error;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::table::{Self, Table};

    // Error codes
    const ENOT_AUTHORIZED: u64 = 1;
    const EALREADY_REGISTERED: u64 = 2;
    const ENOT_REGISTERED: u64 = 3;
    const EINSUFFICIENT_STAKE: u64 = 4;
    const ETOO_EARLY_SUBMISSION: u64 = 5;

    // Structs for the contract state
    struct Agent has store, drop {
        is_registered: bool,
        staked_amount: u64,
        last_submission: u64,
        penalty_count: u64,
        total_submissions: u64,
        reward_tokens: u64,
    }

    struct PriceRound has store {
        timestamp: u64,
        final_price: u64,
        submission_count: u64,
        finalized: bool,
        submitters: vector<address>,
    }

    struct PriceOracleNetwork has key {
        agents: Table<address, Agent>,
        price_submissions: Table<u64, Table<address, u64>>,
        price_rounds: Table<u64, PriceRound>,
        mint_contract: address,
        current_round: u64,
        required_stake: u64,
        submission_window: u64,
        divergence_threshold: u64,
        penalty_amount: u64,
        minimum_submissions: u64,
        subscription_amount: u64,
        round_ids: vector<u64>,
    }

    // Initialize the module
    fun init_module(account: &signer) {
        let oracle_network = PriceOracleNetwork {
            agents: table::new(),
            price_submissions: table::new(),
            price_rounds: table::new(),
            mint_contract: signer::address_of(account),
            current_round: 1,
            required_stake: 100000000,
            submission_window: 900,
            divergence_threshold: 5,
            penalty_amount: 500000000,
            minimum_submissions: 1,
            subscription_amount: 1000000000,
            round_ids: vector::empty(),
        };
        
        move_to(account, oracle_network);
    }

    fun is_registered_internal(oracle_network: &PriceOracleNetwork, account_addr: address): bool {
        if (table::contains(&oracle_network.agents, account_addr)) {
            let agent = table::borrow(&oracle_network.agents, account_addr);
            agent.is_registered
        } else {
            false
        }
    }

    public entry fun register_as_agent(
        account: &signer,
        stake_amount: u64
    ) acquires PriceOracleNetwork {
        init_module(account);
        let account_addr = signer::address_of(account);
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);

        assert!(!is_registered_internal(oracle_network, account_addr), error::already_exists(EALREADY_REGISTERED));
        
        assert!(stake_amount >= oracle_network.required_stake, error::invalid_argument(EINSUFFICIENT_STAKE));
        
        let stake_coins = coin::withdraw<AptosCoin>(account, stake_amount);
        coin::deposit(@price_oracle_network, stake_coins);

        let agent = Agent {
            is_registered: true,
            staked_amount: stake_amount,
            last_submission: 0,
            penalty_count: 0,
            total_submissions: 0,
            reward_tokens: 0,
        };
        
        table::add(&mut oracle_network.agents, account_addr, agent);
    }

    public entry fun submit_price(
        account: &signer,
        price: u64
    ) acquires PriceOracleNetwork {
        let account_addr = signer::address_of(account);
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);

        assert!(is_registered_internal(oracle_network, account_addr), error::permission_denied(ENOT_REGISTERED));

        let agent = table::borrow_mut(&mut oracle_network.agents, account_addr);
        
        let current_time = timestamp::now_seconds();
        assert!(agent.last_submission + oracle_network.submission_window < current_time, 
                error::invalid_state(ETOO_EARLY_SUBMISSION));

        agent.last_submission = current_time;
        agent.total_submissions = agent.total_submissions + 1;
        agent.reward_tokens = agent.reward_tokens + 1;

        let current_round = oracle_network.current_round;

        if (!table::contains(&oracle_network.price_submissions, current_round)) {
            table::add(&mut oracle_network.price_submissions, current_round, table::new());
        };
        
        let round_submissions = table::borrow_mut(&mut oracle_network.price_submissions, current_round);
        table::add(round_submissions, account_addr, price);

        if (!table::contains(&oracle_network.price_rounds, current_round)) {
            table::add(&mut oracle_network.price_rounds, current_round, PriceRound {
                timestamp: current_time,
                final_price: 0,
                submission_count: 0,
                finalized: false,
                submitters: vector::empty(),
            });
        };

        let price_round = table::borrow_mut(&mut oracle_network.price_rounds, current_round);
        price_round.submission_count = price_round.submission_count + 1;
        vector::push_back(&mut price_round.submitters, account_addr);

        if (price_round.submission_count >= oracle_network.minimum_submissions) {
            finalize_round_internal(oracle_network);
        }
    }

    public entry fun finalize_round(account: &signer) acquires PriceOracleNetwork {
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);
        finalize_round_internal(oracle_network);
    }

    public entry fun stake_more(
    account: &signer,
    amount: u64
) acquires PriceOracleNetwork {
    let account_addr = signer::address_of(account);
    let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);

    assert!(is_registered_internal(oracle_network, account_addr), error::permission_denied(ENOT_REGISTERED));

    let stake_coins = coin::withdraw<AptosCoin>(account, amount);
    coin::deposit(@price_oracle_network, stake_coins);

    let agent = table::borrow_mut(&mut oracle_network.agents, account_addr);
    agent.staked_amount = agent.staked_amount + amount;
}

    public entry fun unstake(
    account: &signer,
    amount: u64
) acquires PriceOracleNetwork {
    let account_addr = signer::address_of(account);
    let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);

    assert!(is_registered_internal(oracle_network, account_addr), error::permission_denied(ENOT_REGISTERED));
    
    assert!(amount > 0, error::invalid_argument(EINSUFFICIENT_STAKE));

    let agent = table::borrow_mut(&mut oracle_network.agents, account_addr);

    assert!(agent.staked_amount >= amount, error::invalid_argument(EINSUFFICIENT_STAKE));
    
    // Update agent's staked amount
    agent.staked_amount = agent.staked_amount - amount;
    
    // Transfer APT back to the agent
    let oracle_signer = &account_from_address(@price_oracle_network);
    let unstaked_coins = coin::withdraw<AptosCoin>(oracle_signer, amount);
    coin::deposit(account_addr, unstaked_coins);
}


fun account_from_address(addr: address): signer {
    abort(ENOT_AUTHORIZED)
}

    fun finalize_round_internal(oracle_network: &mut PriceOracleNetwork) {
        let current_round = oracle_network.current_round;
        
        let price_round = table::borrow_mut(&mut oracle_network.price_rounds, current_round);
        
        if (price_round.finalized) {
            return
        };
    
        let round_submissions = table::borrow(&oracle_network.price_submissions, current_round);
        let submitters = &price_round.submitters;
        let total_price = 0;
        let i = 0;
        let len = vector::length(submitters);
        
        while (i < len) {
            let submitter = *vector::borrow(submitters, i);
            let submission_price = *table::borrow(round_submissions, submitter);
            total_price = total_price + submission_price;
            i = i + 1;
        };
        
        let final_price = if (len > 0) { total_price / len } else { 0 };
        
        price_round.final_price = final_price;
        price_round.finalized = true;

        vector::push_back(&mut oracle_network.round_ids, current_round);

        oracle_network.current_round = current_round + 1;
    }

    public entry fun update_required_stake(account: &signer, amount: u64) acquires PriceOracleNetwork {
        let account_addr = signer::address_of(account);
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);
        
        assert!(account_addr == @price_oracle_network, error::permission_denied(ENOT_AUTHORIZED));
        oracle_network.required_stake = amount;
    }
    
    public entry fun update_submission_window(account: &signer, seconds: u64) acquires PriceOracleNetwork {
        let account_addr = signer::address_of(account);
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);
        
        assert!(account_addr == @price_oracle_network, error::permission_denied(ENOT_AUTHORIZED));
        oracle_network.submission_window = seconds;
    }
    
    public entry fun update_minimum_submissions(account: &signer, count: u64) acquires PriceOracleNetwork {
        let account_addr = signer::address_of(account);
        let oracle_network = borrow_global_mut<PriceOracleNetwork>(@price_oracle_network);
        
        assert!(account_addr == @price_oracle_network, error::permission_denied(ENOT_AUTHORIZED));
        oracle_network.minimum_submissions = count;
    }


    #[view]
    public fun get_agent_details(account_addr: address): (bool, u64, u64, u64, u64) acquires PriceOracleNetwork {
        let oracle_network = borrow_global<PriceOracleNetwork>(@price_oracle_network);
        
        if (table::contains(&oracle_network.agents, account_addr)) {
            let agent = table::borrow(&oracle_network.agents, account_addr);
            (
                agent.is_registered,
                agent.staked_amount,
                agent.last_submission,
                agent.penalty_count,
                agent.total_submissions
            )
        } else {
            (false, 0, 0, 0, 0)
        }
    }

    #[view]
    public fun get_latest_price(): (u64, u64, bool) acquires PriceOracleNetwork {
        let oracle_network = borrow_global<PriceOracleNetwork>(@price_oracle_network);

        let round_ids = &oracle_network.round_ids;
        let len = vector::length(round_ids);

        if (len == 0) {
            return (0, 0, false)
        };

        let latest_round_id = *vector::borrow(round_ids, len - 1);
        let price_round = table::borrow(&oracle_network.price_rounds, latest_round_id);

        (price_round.final_price, latest_round_id, price_round.finalized)
    }

    #[view]
    public fun is_registered(account_addr: address): bool acquires PriceOracleNetwork {
        let oracle_network = borrow_global<PriceOracleNetwork>(@price_oracle_network);
        if (table::contains(&oracle_network.agents, account_addr)) {
            let agent = table::borrow(&oracle_network.agents, account_addr);
            agent.is_registered
        } else {
            false
        }
    }


}