# Arkiv integration feedback

- Chain metadata returned by a query is not necessarily a sortable schema column. The board paginates by entity key and derives action order from returned creation blocks.
- Schema query values use typed wrappers before JSON decoding. A compact create/query/render example would help app builders.
- The official documentation identifies Rabdi as the current testnet. Old examples for previous networks can confuse new builders.
- The public RPC is rate limited. A public client key and a separate server key can improve reliability.
- Funding through the official faucet requires wallet authentication and human CAPTCHA completion.
- Multiple injected wallet providers and pending requests need specific errors. Sidequest retains the connected provider for subsequent signing.

This public edition deliberately excludes historical wallet-linked integration evidence.
