{{#if loading}}
    <div class="text-muted">Loading customer context…</div>
{{else}}

    {{#if error}}
        <div class="alert alert-warning">{{error}}</div>
    {{else}}

        {{#if context.customer}}
            <div class="panel panel-default">
                <div class="panel-body">
                    <div class="text-bold">{{context.customer.full_name}}</div>
                    <div class="small text-muted">{{context.customer.email}}</div>
                    {{#if context.customer.phone}}
                        <div class="small text-muted">{{context.customer.phone}}</div>
                    {{/if}}
                    <hr>
                    <table class="table table-condensed table-no-outer-border">
                        <tr>
                            <td class="text-muted">Wallet</td>
                            <td class="text-right">₹{{context.customer.wallet_balance}}</td>
                        </tr>
                        <tr>
                            <td class="text-muted">Reward Coins</td>
                            <td class="text-right">{{context.customer.reward_coins}}</td>
                        </tr>
                        <tr>
                            <td class="text-muted">Member Since</td>
                            <td class="text-right">{{context.customer.member_since}}</td>
                        </tr>
                    </table>
                </div>
            </div>
        {{/if}}

        <div class="panel panel-default">
            <div class="panel-heading">Recent Orders</div>
            <div class="panel-body">
                {{#if context.orders.length}}
                    <table class="table table-condensed table-no-outer-border">
                        <tr>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                        {{#each context.orders}}
                            <tr>
                                <td>{{order_number}}</td>
                                <td>{{status}}</td>
                                <td>₹{{total}}</td>
                            </tr>
                        {{/each}}
                    </table>
                {{else}}
                    <div class="text-muted">No orders found.</div>
                {{/if}}
            </div>
        </div>

        <div class="panel panel-default">
            <div class="panel-heading">Support History</div>
            <div class="panel-body">
                {{#if context.support_history.length}}
                    <table class="table table-condensed table-no-outer-border">
                        <tr>
                            <th>Ticket</th>
                            <th>Status</th>
                        </tr>
                        {{#each context.support_history}}
                            <tr>
                                <td>{{ticket_number}} — {{title}}</td>
                                <td>{{status}}</td>
                            </tr>
                        {{/each}}
                    </table>
                {{else}}
                    <div class="text-muted">No previous tickets.</div>
                {{/if}}
            </div>
        </div>

    {{/if}}
{{/if}}