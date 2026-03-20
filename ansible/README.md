# Ansible deployment

Playbooks in this directory install and configure Teleoscope on Ubuntu VMs (MongoDB, RabbitMQ, Miniconda, Node/PM2, app build, etc.).

## Quick start

1. Copy the example files and edit credentials:
   ```bash
   cp vars/vars.yaml.example vars/vars.yaml
   cp vars/inventory.yaml.example vars/inventory.yaml
   ```
2. Adjust `vars/vars.yaml` (see **Example variables** below and the full comments in `vars/vars.yaml.example`).
3. Run the main playbook:
   ```bash
   ansible-playbook -i vars/inventory.yaml newteleoscope.yaml
   ```
4. For a dedicated vectorizer host, use `newvectorizer.yaml`.

You need your own cloud or bare-metal hosts (e.g. AWS, Azure). For inventory format, see the [Ansible inventory guide](https://docs.ansible.com/ansible/latest/inventory_guide/index.html). For variables, see the [Ansible variables guide](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html).

## Example variables

`vars/vars.yaml.example` is the maintained template. You can start from this paste-friendly block and replace placeholders with your own values:

```yaml
remote_prefix: /home                              # example for linux 
conda_environment: teleoscope                     # any label will do
conda_prefix: /usr/share/miniconda3               # you can change this to ~/miniconda3 if you don't have access to /usr/share
mongodb_admin_name: example_admin                 # replace "example_admin" with your administrator name
mongodb_admin_password: admin_password            # replace "admin_password" with your administrator's password
mongodb_dev_name: example_dev                     # replace "example_dev" with your name
mongodb_dev_password: dev_password                # replace "dev_password" with your password
mongodb_database: teleoscope                      # any label will do
rabbitmq_vhost: teleoscope                        # any label will do
rabbitmq_admin_username: example_admin            # replace "example_admin" with your administrator name (can be different than above)
rabbitmq_admin_password: admin_password           # replace "admin_password" with your administrator's password (can be different than above)
rabbitmq_dev_username:  example_dev               # replace "example_dev" with your name (can be different than above)
rabbitmq_dev_password: dev_password               # replace "dev_password" with your password (can be different than above)
nodejs_version: 19                                # tested for 19
ubuntu_version: jammy                             # tested for focal and jammy, may need to change some configs for focal
```

## Nginx / TLS

Example site config for `teleoscope.ca` (reverse proxy to the app and RabbitMQ management) lives in `teleoscope.ca.conf`.
