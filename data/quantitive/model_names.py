name_version1_file = '/Users/l/klee_code/git_repos/eduarena/data/quantitive/main_experiments.csv'
name_version1_name_column = '模型名'
name_version2_file = '/Users/l/klee_code/git_repos/eduarena/data/quantitive/lmarena_table.csv'
name_version2_column = 'model'
# Keys are names from main_experiments.csv; values are the closest model ids in
# lmarena_table.csv. An empty string means there is no reliable counterpart yet.
mapping = {
        'InnoSpark-72B-0710'          : 'qwen2.5-72b-instruct',
        'InnoSpark-R-72B-0701'        : 'deepseek-r1',
        'InnoSpark-7B-0715'           : '',
        'InnoSpark-0.5B-0717'         : '',
        'InnoSpark-235B-1020'         : 'qwen3-235b-a22b-instruct-2507',
        'DeepSeek-V3'                 : 'deepseek-v3-0324',
        'DeepSeek-R1'                 : 'deepseek-r1',
        'Qwen-2.5-72B-Instruct'       : 'qwen2.5-72b-instruct',
        'Spark-v4.0-Ultra'            : '',
        'MuduoLLM'                    : '',
        'Qwen3-235B'                  : 'qwen3-235b-a22b-instruct-2507',
        'GPT-4o'                      : 'gpt-4o-2024-08-06',
        'gemini-2.5-pro-preview-06-05': 'gemini-2.5-pro',
        'claude-sonnet-4'             : 'claude-sonnet-4-6',
        'grok4'                       : 'grok-4-0709',
        'GPT-5'                       : 'gpt-5.4',
        'Qwen2.5-32B-Instruct'        : '',
}
