FROM alpine:latest

RUN apk add --no-cache iproute2

CMD ["/bin/sh", "-xc", "tc qdisc del dev eth0 root || true; tc qdisc add dev eth0 root tbf rate $TC_RATE burst $TC_BURST latency $TC_LATENCY"]
