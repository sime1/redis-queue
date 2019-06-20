-- This script creates the subrequests and inserts them into the stream.
-- At the end of the script the workers are still waiting, since no token
-- has been inserted into the priority lists.
-- 
-- KEYS[1] is the id of the request
-- ARGV contains the actual sub-requests

local req_stream = string.format( "sub:{%s}", KEYS[1] )
redis.call("SET", string.format( "counter:{%s}", KEYS[1] ), #ARGV)
-- we need to create the stream before the group
redis.call("XADD", req_stream, "*", "req", "0")
redis.call("XTRIM", req_stream, "MAXLEN", "0")
redis.call("XGROUP", "CREATE", req_stream, req_stream, "$")
for _, r in ipairs(ARGV) do
  redis.call("XADD", req_stream, "*", "req", r)
end
return redis.status_reply("OK")
