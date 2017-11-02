docker build -t akateiva/snatchem . && \
docker run -d --restart unless-stopped --name snatchem \
  --log-driver syslog \
  --log-opt syslog-address=tcp://127.0.0.1:5000 \
  akateiva/snatchem
