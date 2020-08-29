#!/bin/bash

aws s3 sync . s3://smartathome.co.uk/hue/ --exclude ".git*" --exclude "scripts/*" --exclude "images/*"
