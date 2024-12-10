FROM nvidia/cuda:11.3.1-cudnn8-devel-ubuntu20.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3.9-distutils \
    && rm -rf /var/lib/apt/lists/*


RUN apt-get update && apt-get install -y \
    curl

# Install pip for Python 3.9
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.9

# Create symlinks
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
RUN update-alternatives --set python3 /usr/bin/python3.9

# Clone Semantic-SAM early
WORKDIR /sam_app
RUN git clone https://github.com/UX-Decoder/Semantic-SAM .

# Install PyTorch with CUDA support
RUN pip3 install torch==1.13.1 torchvision==0.14.1 --extra-index-url https://download.pytorch.org/whl/cu113

# Install detectron2-xyz
RUN python3 -m pip install 'git+https://github.com/MaureenZOU/detectron2-xyz.git'

# Install panopticapi
RUN pip3 install git+https://github.com/cocodataset/panopticapi.git

# Install requirements
RUN python3 -m pip install -r requirements.txt

# Install requests
RUN python3 -m pip install requests

RUN ln -sf /usr/bin/python3.9 /usr/bin/python3
RUN ln -sf /usr/bin/python3.9 /usr/bin/python

# Set environment variable for dataset path
ENV DATASET=/data/coco

# Default command
CMD ["bash"]

