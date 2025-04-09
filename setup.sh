#!/bin/bash

# Check if Homebrew is installed, install if not
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "Homebrew already installed, updating..."
    brew update
fi

# Install Homebrew Cask
brew install mas

# Install Chrome
echo "Installing Chrome..."
brew install --cask google-chrome

# Install VS Code
echo "Installing Visual Studio Code..."
brew install --cask visual-studio-code

# Install KakaoTalk
echo "Installing KakaoTalk..."
mas install 869223134

# Install fnm (Fast Node Manager)
echo "Installing fnm..."
brew install fnm

# Add fnm to shell
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc

# Install Node.js 20 using fnm
echo "Installing Node.js 20..."
fnm install 20
fnm use 20
fnm default 20

# Install pyenv
echo "Installing pyenv..."
brew install pyenv

# Add pyenv to shell
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Install Python dependencies
brew install openssl readline sqlite3 xz zlib tcl-tk

# Install Python 3.10.12 using pyenv
echo "Installing Python 3.10.12..."
pyenv install 3.10.12
pyenv global 3.10.12

# Source .zshrc to apply changes
echo "Setup complete! Please restart your terminal or run 'source ~/.zshrc' to apply changes."