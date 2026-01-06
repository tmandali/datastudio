# Standard Jupyter Server Configuration
print("--> LOADING JUPYTER SERVER CONFIGURATION <--")
c = get_config()

# Network
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 8888
c.ServerApp.open_browser = False

# Security
c.ServerApp.allow_remote_access = True
c.ServerApp.allow_origin = '*'
c.ServerApp.disable_check_xsrf = True
c.ServerApp.token = 'datastudio'
c.IdentityProvider.token = 'datastudio'
