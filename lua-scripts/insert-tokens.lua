-- insert the tokens into the appropriate priority list, so that the workers get
-- notified and start processing all the subrequests
--
-- KEYS[1] contains the key of the list with the priority of the request
-- ARGV[1] contains the ID of the request (i.e. the token)
-- ARGV[2] contains the concurrency limit, i.e. the number of workers that will
-- process sub-requests concurrently
for i = 1, ARGV[2] do
  redis.call("LPUSH", KEYS[1], ARGV[1])
end
return redis.status_reply("OK")
