import * as dotenv from "dotenv";
import convict from "convict";

dotenv.config();

interface ConfigSchema {
    brave_search_api_key: string;
    agent_work_dir: string;
    main_work_space_dir: string;
    user_name: string;
    llm_server: {
        host_ip: string;
        host_port: number;
    };
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    }
}

const env = convict<ConfigSchema>({
    brave_search_api_key: {
        format: String,
        default: "",
        env: "BRAVE_SEARCH_API_KEY",
        doc: "Brave Search API Key",
    },
    agent_work_dir: {
        format: String,
        default: "home/fxdonad/Fxdonad/Agent",
        env: "AGENT_WORK_DIR",
        doc: "Agent folder path working on local machine, used for file operations",
    },
    main_work_space_dir: {
        format: String,
        default: "home/fxdonad",
        env: "WORK_SPACE_DIR",
        doc: "Main workspace directory for the agent, used for file operations",
    },
    user_name: {
        format: String,
        default: "fxdonad",
        env: "USER_NAME",
        doc: "Username for the agent to operate with, used for file operations and command execution",
    },
    llm_server:
    {
        host_ip: {
            format: String,
            default: "127.0.0.1",
            env: "HOST_IP",
            doc: "Host IP address for the agent to bind or connect to",
        },
        host_port: {
            format: Number,
            default: 1235,
            env: "HOST_PORT",
            doc: "Host port for the agent to bind or connect to",
        },
    },
    database: {
        host: {
            format: String,
            default: "localhost",
            env: "DB_HOST",
            doc: ""
        },
        port: {
            format: Number,
            default: 3308,
            env: "DB_PORT",
            doc: ""
        },
        username: {
            format: String,
            default: "admin",
            env: "DB_USERNAME",
            doc: ""
        },
        password: {
            format: String,
            default: "admin",
            env: "DB_PASSWORD",
            doc: ""
        },
        database: {
            format: String,
            default: "",
            env: "DB_NAME",
            doc: ""
        }
    }
});

// Kiểm tra cấu hình
env.validate({ allowed: "strict" });

export default env;