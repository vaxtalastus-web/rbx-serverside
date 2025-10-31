local vLuau = require(108059886578663)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local BASE_URL = "https://WHATEVER_YOUR_DEPLOYMENT_URL_IS_BRO/api" 
local function sendRequestAsync(endpoint, data)
	task.spawn(function()
		pcall(function()
			HttpService:RequestAsync({
				Url = BASE_URL .. endpoint,
				Method = "POST",
				Headers = {
					["Content-Type"] = "application/json"
				},
				Body = HttpService:JSONEncode(data)
			})
		end)
	end)
end
Players.PlayerAdded:Connect(function(player)
	sendRequestAsync("/servers/players/add", {
		user = player.Name,
		jobId = game.JobId,
		placeId = game.PlaceId
	})
end)
Players.PlayerRemoving:Connect(function(player)
	sendRequestAsync("/servers/players/remove", {
		user = player.Name,
		jobId = game.JobId,
		placeId = game.PlaceId
	})
end)
task.spawn(function()
	while task.wait(3) do
		local success, response = pcall(function()
			local url = string.format("%s/servers/execute-queue?jobId=%s&placeId=%s", BASE_URL, game.JobId, game.PlaceId)
			return HttpService:GetAsync(url)
		end)

		if success and response and response ~= "" then
			vLuau.luau_load(vLuau.luau_compile(response))
		end
	end
end)
game:BindToClose(function()
	pcall(function()
		HttpService:RequestAsync({
			Url = BASE_URL .. "/servers/shutdown",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json"
			},
			Body = HttpService:JSONEncode({
				placeId = game.PlaceId,
				jobId = game.JobId
			})
		})
	end)
end)
