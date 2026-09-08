# AWS resources (development)

Created 2026-09-08 with the AWS CLI as IAM user `utilnext-deployer`, account 945816504222.

| Resource | Value |
|---|---|
| Region | `ap-south-1` (Mumbai), default VPC `vpc-05982ac51707a3477`, subnet `subnet-0fe8e7d0ef5dff250` (ap-south-1c) |
| Instance | `i-024a957e8e4a464ee`, `t3.medium`, Ubuntu 24.04 (`ami-0c0fd09cfe77b59dc`), 30 GB gp3, Name `utilnext-dev` |
| Elastic IP | `13.206.22.220` (`eipalloc-0fd98050dd44750db`) |
| Security group | `sg-0fc6e92ea9d0c4502` `utilnext-web`: TCP 22, 80, 443 from anywhere |
| Key pair | `utilnext-ap-south-1` (ed25519; private key on the dev machine at `~/.ssh/utilnext-ap-south-1`) |
| SSH | `ssh -i ~/.ssh/utilnext-ap-south-1 ubuntu@13.206.22.220` |
| Checkout | `/opt/utilnext` (branch `release`), env in `/opt/utilnext/deploy/.env` (not in git) |
| Site | `utilnext`, https://erp.utilnext.com (also https://utilnext.com), `ENABLE_TLS=true`, Let's Encrypt via Traefik |
| Domain | `utilnext.com` registered in Route 53 (2026-09-08, expires 2027-09-08); hosted zone `Z0517653J36YUSXE62KV`; A records `erp` and apex -> 13.206.22.220 |

Commands used (for reproducing in another region/account):

```bash
aws ec2 describe-images --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId'
aws ec2 import-key-pair --key-name utilnext-ap-south-1 --public-key-material fileb://~/.ssh/utilnext-ap-south-1.pub
aws ec2 create-security-group --group-name utilnext-web --description "UtilNext web server" --vpc-id <vpc>
aws ec2 authorize-security-group-ingress --group-id <sg> --ip-permissions \
  'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0}]' \
  'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
  'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]'
aws ec2 run-instances --image-id <ami> --instance-type t3.medium --key-name utilnext-ap-south-1 \
  --security-group-ids <sg> --subnet-id <subnet> --user-data fileb://deploy/aws/user-data.sh \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --metadata-options HttpTokens=required
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id <i-…> --allocation-id <eipalloc-…>
```

## Cost control

- `aws ec2 stop-instances --instance-ids i-024a957e8e4a464ee` when idle (Elastic IP stays; a
   stopped instance costs only the 30 GB volume, about $2.5/month, plus $3.6/month for the idle EIP).
- Resize later: stop, `aws ec2 modify-instance-attribute --instance-id … --instance-type '{"Value":"t3.large"}'`, start.

## Domain and TLS (done 2026-09-08)

- Route 53 A records `erp.utilnext.com` and `utilnext.com` -> Elastic IP (TTL 300).
- Server `deploy/.env`: `ENABLE_TLS=true`, `SITES_RULE=Host(`erp.utilnext.com`) || Host(`utilnext.com`)`,
  `LETSENCRYPT_EMAIL`, `PUBLIC_URL=https://erp.utilnext.com`; `deploy.sh` switched Traefik to the https override.
- Certificate is issued and renewed automatically by Traefik (stored in the `cert-data` volume).
- Registrar to-dos: enable auto-renew and transfer lock on the domain.
