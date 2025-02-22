export default ({
  'day/month/year': /^$|^(?:(?:31(\/)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/,
  dotação: /^(\d{2}(\.\d{2}(\.\d{2}(\.\d{3}(\.\d{4}((?:\.\d\.\d{3})(\.\d{8}(\.\d{2})?)?)?)?)?)?)?)?$/,
  dotaçãoComComplemento: /^(\d{2}(\.\d{2}(\.\d{2}(\.\d{3}(\.\d{4}((?:\.\d\.\d{3})(\.\d{8}(\.\d{2}(\.\d\.\d{3}\.\d{4})?)?)?)?)?)?)?)?)?$/,
  dotaçãoComCuringas: /^(\d{2}(\.\d{2}(\.\d{2}(\.\d{3}(\.[0-9*]{4}((?:\.\d\.\d{3})(\.[0-9*]{8}(\.\d{2})?)?)?)?)?)?)?)?$/,
  'month/year': /^$|^(?:0[1-9]|1[0-2]|[1-9])\/(?:(?:1[9]|[2-9]\d)?\d{2})$/,
  nota: /^\d{1,5}$/,
  sei: /^\d{4}\.?\d{4}\/?\d{7}-?\d|\d{4}$/,
  seiOuSinproc: /^(?:\d{4}\.?\d{4}\/?\d{7}-?\d|\d{4}-?\d\.?\d{3}\.?\d{3}-?\d)$/,
});
