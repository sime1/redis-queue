module.exports = async function readMessageFromGroup(client, reqID, consumer = 'consumer') {
  const stream = `sub:{${reqID}}`;
  const [[, [res]]] = await client.xreadgroup('GROUP', stream, consumer, 'COUNT', 1, 'STREAMS', stream, '>');
  return res;
};
