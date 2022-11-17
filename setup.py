import setuptools

with open('./requirements.txt') as f:
    required = f.read().splitlines()

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="hola-mac",
    version="0.0.1",
    author="JunBeum Cho",
    author_email="ahengksk@gmail.com",
    description="Common packages installer on MAC",
    url = 'https://github.com/JunBeum-Cho/hola-mac',
    download_url = 'https://github.com/user/reponame/archive/v_01.tar.gz',
    entry_points={"console_scripts": ["hola-mac=src.__main__:main"]},
    keywords = ['mac', 'package installers'],
    install_requires=required,
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages()
)