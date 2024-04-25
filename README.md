# suprsend-node-sdk
This package can be included in a node project to easily integrate with `Suprsend` platform.

Refer full documentation [here](https://docs.suprsend.com/docs/nodejs-sdk)

### Installation
`suprsend-node-sdk` is available as npm package. You can install using npm or yarn.
```bash
npm install @suprsend/node-sdk
```

### Initialization
Initialize the Suprsend SDK
```node
const {Suprsend} = require("@suprsend/node-sdk");

// Initialize SDK
const supr_client = new Suprsend("workspace_key", "workspace_secret");
```

### License
MIT © [https://github.com/suprsend](https://github.com/suprsend)
