from pymilvus import MilvusClient, DataType

client = MilvusClient(uri="http://localhost:19530")

schema = client.create_schema(
    auto_id=False,
    enable_dynamic_fields=False,
)

schema.add_field(
    field_name="id",
    datatype=DataType.VARCHAR,
    is_primary=True,
    max_length=32,
)

schema.add_field(
    field_name="title",
    datatype=DataType.VARCHAR,
    max_length=2048,
)

schema.add_field(
    field_name="text",
    datatype=DataType.VARCHAR,
    max_length=65535,
)

schema.add_field(
    field_name="combined_text",
    datatype=DataType.VARCHAR,
    max_length=65535,
)

schema.add_field(
    field_name="dense",
    datatype=DataType.FLOAT_VECTOR,
    dim=1024,
)

index_params = MilvusClient.prepare_index_params()

index_params.add_index(
    field_name="dense",
    index_name="dense_ivf_flat",
    index_type="IVF_FLAT",
    metric_type="COSINE",
    params={"nlist": 1024},
)

client.create_collection(
    collection_name="reddit_posts",
    schema=schema,
    index_params=index_params,
)