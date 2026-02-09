FROM debian:bookworm-slim AS builder

RUN apt update
RUN apt install curl unzip -y
RUN curl -fsSL https://bun.com/install | bash
COPY ./dm-chat /dm-chat
WORKDIR /dm-chat
RUN . $HOME/.bashrc
RUN $HOME/.bun/bin/bun i
RUN $HOME/.bun/bin/bun build ./server.ts --compile --outfile server
RUN chmod +x ./server

FROM scratch
COPY --from=builder /dm-chat/server /server 
COPY --from=builder /lib /lib
COPY --from=builder /lib64 /lib64
COPY --from=builder /bin/sh /bin/sh
ENTRYPOINT ["/server"]
