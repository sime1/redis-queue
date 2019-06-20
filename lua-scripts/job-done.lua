-- this script checks if we processed the whole request, and if so it cleans
-- up all the structures created.
-- If we did not process the whole request, the subrequest we just processed
-- is acknowledged.
--
-- KEYS[1] contains the ID of the request
-- ARGV[1] contains the ID of the request entry in the consumer group

local req_stream = string.format( "sub:{%s}", KEYS[1] )
local counter = string.format( "counter:{%s}",KEYS[1] )
local remaining = redis.call("DECR", counter)
if remaining == 0 then
  redis.call("XGROUP", "DESTROY", req_stream, req_stream)
  redis.call("DEL", req_stream)
  redis.call("DEL", counter)
  redis.call("PUBLISH", KEYS[1], "1")
else
  redis.call("XACK", req_stream, req_stream, ARGV[1])
end
return redis.status_reply("OK")
