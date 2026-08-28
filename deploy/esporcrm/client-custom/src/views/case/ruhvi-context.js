define('custom:views/case/ruhvi-context', ['view'], function (Dep) {
  return Dep.extend({
    template: 'custom:case/ruhvi-context',

    data: function () {
      return {
        context: this.context,
        loading: this.loading,
        error: this.error,
      };
    },

    setup: function () {
      this.context = null;
      this.loading = true;
      this.error = null;

      var ticketId = this.model.get('ruhviTicketId_c') || null;
      var email = this.model.get('ruhviCustomerEmail_c') || null;

      if (!ticketId && !email) {
        this.loading = false;
        this.error = 'No Ruhvi ticket link on this case.';
        return;
      }

      var params = {};
      if (ticketId) params.ticketId = ticketId;
      if (email) params.email = email;

      this.fetchContext(params);
    },

    fetchContext: function (params) {
      var url = 'RuhviContext/action/getContext?' + $.param(params);

      Espo.Ajax.getRequest(url)
        .then((result) => {
          this.context = result;
          this.loading = false;
          this.reRender();
        })
        .catch(() => {
          this.loading = false;
          this.error = 'Could not load Ruhvi context.';
          this.reRender();
        });
    },
  });
});
